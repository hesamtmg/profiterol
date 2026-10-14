import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { allBlocks, type BlockDef, type BlockNode, CUSTOM_BLOCK_PREFIX, validateBlockDef, withCommonFields } from '@profiterol/blocks';
import { randomBytes } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { AiConnectionsService, connectionLabel } from '../ai/ai-connections';
import { AiError, type AiMessage } from '../ai/providers';
import { currentSiteId } from '../sites/site-context';
import { BlockCompileError, compileBlock } from './compile';
import { CustomBlock, type CustomBlockVersion } from './custom-block.entity';
import { liveCustomDefs } from './live-defs';
import { ANSWER_SCHEMA, SYSTEM_PROMPT } from './prompt';

/** Earlier messages sent along with each request: enough for "now make it darker", without growing without end. */
const HISTORY = 8;
/** Extra rounds in which the AI may fix what the checks found, before the admin sees the problems. */
const FIX_ROUNDS = 2;
const MAX_BLOCKS = 100;

/** Who asks: their id picks their own AI models, their email is shown in the conversation. */
export interface Author {
  id: string;
  email: string;
}

export interface DraftInput {
  def: unknown;
  source: string;
}

@Injectable()
export class CustomBlocksService {
  constructor(
    @InjectRepository(CustomBlock) private readonly repo: Repository<CustomBlock>,
    private readonly ai: AiConnectionsService,
    private readonly dataSource: DataSource,
  ) {}

  list() {
    return this.repo.find({ where: { siteId: currentSiteId() }, order: { createdAt: 'DESC' } });
  }

  async get(id: string) {
    const block = await this.repo.findOneBy({ id, siteId: currentSiteId() });
    if (!block) throw new NotFoundException('Block not found');
    return block;
  }

  /** The approved blocks' definitions, with the shared fields: what pages may use. */
  liveDefs(): Promise<BlockDef[]> {
    return liveCustomDefs(this.dataSource);
  }

  /** For the public page: where to load each approved custom block used in these blocks, and its defaults. */
  async scriptsFor(blocks: BlockNode[]) {
    const types = [...new Set(allBlocks(blocks).map((b) => b.type))].filter((t) => t.startsWith(CUSTOM_BLOCK_PREFIX));
    if (!types.length) return [];
    const found = await this.repo
      .createQueryBuilder('b')
      .where('b.siteId = :siteId', { siteId: currentSiteId() })
      .andWhere('b.status = :status', { status: 'live' })
      .andWhere('b.type IN (:...types)', { types })
      .getMany();
    return found.flatMap((b) =>
      b.live ? [{ type: b.type, url: moduleUrl(b.id, b.live.hash), defaults: withCommonFields(b.live.def).defaults }] : [],
    );
  }

  /** The approved module's code, when the hash in the address is the current one. */
  async liveModule(id: string, hash: string): Promise<string> {
    const block = await this.repo.findOneBy({ id, siteId: currentSiteId(), status: 'live' }).catch(() => null);
    if (!block?.live || block.live.hash !== hash) throw new NotFoundException();
    return block.live.compiled;
  }

  /** Asks the AI for a new block, with the admin's own model (`connectionId`, else their default). */
  async generate(prompt: string, author: Author, connectionId?: string) {
    if ((await this.repo.countBy({ siteId: currentSiteId() })) >= MAX_BLOCKS) {
      throw new BadRequestException(`A site can have up to ${MAX_BLOCKS} custom blocks`);
    }
    const { version, messages } = await this.askAi([], prompt, author, connectionId);
    // ASCII only (a Persian label gives just "block"), with a random end so two blocks never share a type.
    const name = version.def.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const type = `${CUSTOM_BLOCK_PREFIX}${name || 'block'}-${randomBytes(3).toString('hex')}`;
    version.def.type = type;
    return this.repo.save(
      this.repo.create({
        siteId: currentSiteId(),
        type,
        status: 'draft',
        draft: version,
        live: null,
        conversation: messages,
        createdBy: author.email,
      }),
    );
  }

  /** Asks the AI to change a block's draft ("make the cards rounder"). */
  async refine(id: string, prompt: string, author: Author, connectionId?: string) {
    const block = await this.get(id);
    const { version, messages } = await this.askAi(block.conversation, prompt, author, connectionId, block.type);
    block.draft = version;
    block.conversation = messages;
    return this.repo.save(block);
  }

  /** A change made by hand in the builder's code editor. */
  async saveDraft(id: string, input: DraftInput) {
    const block = await this.get(id);
    const problems: string[] = [];
    const version = this.build(input.def, input.source, block.type, problems);
    if (!version) throw new UnprocessableEntityException({ message: 'The block has problems', problems });
    block.draft = version;
    return this.repo.save(block);
  }

  /** Puts the draft in use on the site (owner only, see the controller). */
  async approve(id: string, approver: string) {
    const block = await this.get(id);
    block.live = block.draft;
    block.status = 'live';
    block.approvedBy = approver;
    return this.repo.save(block);
  }

  async setDisabled(id: string, disabled: boolean) {
    const block = await this.get(id);
    if (!block.live) throw new BadRequestException('Approve the block first');
    block.status = disabled ? 'disabled' : 'live';
    return this.repo.save(block);
  }

  /** Deletes a block that no page (draft, published or saved section) uses any more. */
  async remove(id: string) {
    const block = await this.get(id);
    const pattern = `%"type": "${block.type}"%`;
    const [{ count }] = await this.dataSource.query(
      `SELECT count(*)::int AS count FROM page_translations
       WHERE "siteId" = $1 AND (blocks::text LIKE $2 OR coalesce("publishedBlocks"::text, '') LIKE $2)`,
      [block.siteId, pattern],
    );
    const [{ sections }] = await this.dataSource.query(
      `SELECT count(*)::int AS sections FROM site_settings WHERE "siteId" = $1 AND sections::text LIKE $2`,
      [block.siteId, pattern],
    );
    if (count > 0 || sections > 0) {
      throw new ConflictException('Pages or saved sections still use this block. Remove it from them first, or disable it instead.');
    }
    await this.repo.delete({ id: block.id });
  }

  /** Checks and compiles one version. Returns null and fills `problems` when something is wrong. */
  private build(defInput: unknown, source: string, type: string, problems: string[]): CustomBlockVersion | null {
    const { def, errors } = validateBlockDef(defInput, type);
    problems.push(...errors.map((e) => `definition ${e.path}: ${e.message}`));
    try {
      const { code, hash } = compileBlock(String(source ?? ''));
      return problems.length ? null : { def, source, compiled: code, hash };
    } catch (err) {
      if (!(err instanceof BlockCompileError)) throw err;
      problems.push(...err.problems);
      return null;
    }
  }

  /**
   * One request to the AI. When its block does not pass the checks, the problems are sent back for it to fix, a few
   * times at most; every round counts towards the site's daily limit.
   */
  private async askAi(
    history: CustomBlock['conversation'],
    prompt: string,
    author: Author,
    connectionId?: string,
    type = `${CUSTOM_BLOCK_PREFIX}new`,
  ) {
    const { connection, provider } = await this.ai.pick(author.id, connectionId);
    const asked = { role: 'user' as const, content: prompt, at: new Date().toISOString(), author: author.email };
    const messages: AiMessage[] = [
      ...history.slice(-HISTORY).map(({ role, content }) => ({ role, content })),
      { role: 'user', content: prompt },
    ];
    let problems: string[] = [];
    for (let round = 0; round <= FIX_ROUNDS; round++) {
      await this.ai.useOne(connection);
      let answer: Record<string, unknown>;
      try {
        answer = await provider.generateJson({ system: SYSTEM_PROMPT, messages, schema: ANSWER_SCHEMA, maxTokens: 32000 });
      } catch (err) {
        if (err instanceof AiError) throw new BadRequestException(err.message);
        throw err;
      }
      problems = [];
      let def: unknown = null;
      try {
        def = JSON.parse(String(answer.def_json ?? ''));
      } catch {
        problems.push('def_json is not valid JSON');
      }
      const version = def ? this.build(def, String(answer.source ?? ''), type, problems) : null;
      const reply = { role: 'assistant' as const, content: JSON.stringify(answer) };
      if (version) {
        return { version, messages: [...history, asked, { ...reply, at: new Date().toISOString(), model: connectionLabel(connection) }] };
      }
      messages.push(reply, {
        role: 'user',
        content: `The block did not pass the checks. Fix every problem and answer with the complete block again:\n- ${problems.join('\n- ')}`,
      });
    }
    throw new UnprocessableEntityException({
      message: 'The AI could not build a block that passes the checks. Try rephrasing the request.',
      problems,
    });
  }
}

/** Under /api/public, with the code's hash in the name: cached for good, and a new version gets a new address. */
export const moduleUrl = (id: string, hash: string) => `/api/public/custom-blocks/${id}/${hash}.js`;
