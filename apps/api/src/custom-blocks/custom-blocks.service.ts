import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { allBlocks, type BlockDef, type BlockNode, CUSTOM_BLOCK_PREFIX, validateBlockDef, withCommonFields } from '@profiterol/blocks';
import { randomBytes, randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { AiConnectionsService, connectionLabel } from '../ai/ai-connections';
import { type AiPart, attachmentNote, type AttachmentInfo } from '../ai/attachments';
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
/** How long a finished AI request's result waits to be picked up by the builder. */
const JOB_KEEP_MS = 60 * 60 * 1000;

/**
 * An AI request running in the background (see background()). Kept in memory: a restart of the API loses it, and
 * the builder then says to try again.
 */
interface Job {
  siteId: string;
  userId: string;
  startedAt: string;
  /** What the AI has done so far, for the builder's conversation while it waits. */
  steps: AiStep[];
  finishedAt?: number;
  block?: CustomBlock;
  /** The HTTP error the request would have answered with. */
  error?: { status: number; body: string | object };
}

/**
 * One step of a request in progress: a round sent to the AI (`asking`), or an answer that failed the checks and
 * goes back to the AI with its problems (`problems`).
 */
export type AiStep =
  | { kind: 'asking'; at: string; round: number; rounds: number; model: string }
  | { kind: 'problems'; at: string; round: number; summary: string; problems: string[] };

/** Who asks: their id picks their own AI models, their email is shown in the conversation. */
export interface Author {
  id: string;
  email: string;
}

/** Pictures and files attached to a request (see readAttachments). */
export interface Attached {
  parts: AiPart[];
  info: AttachmentInfo[];
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

  private readonly log = new Logger(CustomBlocksService.name);
  private readonly jobs = new Map<string, Job>();

  /**
   * Runs an AI request (generate or refine) without holding the HTTP request open: the AI can take minutes, longer
   * than nginx, other proxies in front or a mobile connection keep a request waiting. Returns the job's id; the
   * builder asks job() for the result every few seconds.
   */
  background(userId: string, work: (report: (step: AiStep) => void) => Promise<CustomBlock>): string {
    const now = Date.now();
    for (const [id, j] of this.jobs) if (j.finishedAt && now - j.finishedAt > JOB_KEEP_MS) this.jobs.delete(id);
    const id = randomUUID();
    const job: Job = { siteId: currentSiteId(), userId, startedAt: new Date().toISOString(), steps: [] };
    this.jobs.set(id, job);
    // Started inside the request, so it keeps the request's site (see site-context.ts) after the answer is sent.
    work((step) => job.steps.push(step)).then(
      (block) => Object.assign(job, { block, finishedAt: Date.now() }),
      (err: unknown) => {
        if (!(err instanceof HttpException))
          this.log.error(`AI request failed: ${err instanceof Error ? (err.stack ?? err.message) : err}`);
        const error =
          err instanceof HttpException
            ? { status: err.getStatus(), body: err.getResponse() }
            : { status: 500, body: { statusCode: 500, message: 'The AI request failed.' } };
        Object.assign(job, { error, finishedAt: Date.now() });
      },
    );
    return id;
  }

  /** A background request: its block once ready, else what the AI has done so far. Throws the request's error. */
  job(userId: string, id: string): { block: CustomBlock | null; startedAt: string; steps: AiStep[] } {
    const job = this.jobs.get(id);
    if (!job || job.userId !== userId || job.siteId !== currentSiteId()) {
      throw new NotFoundException('This AI request is no longer running, maybe because the server restarted. Try again.');
    }
    if (job.error) throw new HttpException(job.error.body, job.error.status);
    return { block: job.block ?? null, startedAt: job.startedAt, steps: job.steps };
  }

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
  async generate(prompt: string, author: Author, connectionId?: string, attached?: Attached, report?: (step: AiStep) => void) {
    if ((await this.repo.countBy({ siteId: currentSiteId() })) >= MAX_BLOCKS) {
      throw new BadRequestException(`A site can have up to ${MAX_BLOCKS} custom blocks`);
    }
    const { version, messages } = await this.askAi([], prompt, author, connectionId, attached, undefined, report);
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
  async refine(id: string, prompt: string, author: Author, connectionId?: string, attached?: Attached, report?: (step: AiStep) => void) {
    const block = await this.get(id);
    const { version, messages } = await this.askAi(block.conversation, prompt, author, connectionId, attached, block.type, report);
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
    attached: Attached = { parts: [], info: [] },
    type = `${CUSTOM_BLOCK_PREFIX}new`,
    report: (step: AiStep) => void = () => undefined,
  ) {
    const { connection, provider } = await this.ai.pick(author.id, connectionId);
    const asked = {
      role: 'user' as const,
      content: prompt,
      at: new Date().toISOString(),
      author: author.email,
      ...(attached.info.length ? { attachments: attached.info } : {}),
    };
    // Earlier turns go as text (their files were sent with them); this request carries its own files.
    const messages: AiMessage[] = [
      ...history.slice(-HISTORY).map(({ role, content, attachments }) => ({ role, content: content + attachmentNote(attachments) })),
      { role: 'user', content: attached.parts.length ? [...attached.parts, { type: 'text', text: prompt }] : prompt },
    ];
    let problems: string[] = [];
    for (let round = 0; round <= FIX_ROUNDS; round++) {
      await this.ai.useOne(connection);
      const at = () => new Date().toISOString();
      report({ kind: 'asking', at: at(), round: round + 1, rounds: FIX_ROUNDS + 1, model: connectionLabel(connection) });
      let answer: Record<string, unknown>;
      try {
        answer = await provider.generateJson({ system: SYSTEM_PROMPT, messages, schema: ANSWER_SCHEMA, maxTokens: 32000 });
      } catch (err) {
        if (err instanceof AiError) throw new BadRequestException(err.message);
        throw err;
      }
      problems = [];
      const def = readDef(answer.def_json, problems);
      const version = def ? this.build(def, String(answer.source ?? ''), type, problems) : null;
      const reply = { role: 'assistant' as const, content: JSON.stringify(answer) };
      if (version) {
        return { version, messages: [...history, asked, { ...reply, at: new Date().toISOString(), model: connectionLabel(connection) }] };
      }
      report({ kind: 'problems', at: at(), round: round + 1, summary: String(answer.summary ?? ''), problems: [...problems] });
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

/**
 * The definition from the AI's answer. It should be a string of JSON, but only OpenAI enforces the answer's shape:
 * other services' models (e.g. gpt-4o-mini through GapGPT) often send the object itself, or the JSON in a code
 * fence; both are taken as meant. Otherwise returns null and says exactly what is wrong, so the AI can fix it.
 */
export function readDef(value: unknown, problems: string[]): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) {
    problems.push('def_json is missing: give the block definition as a string of JSON');
    return null;
  }
  const text = value.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/, '$1');
  try {
    return JSON.parse(text);
  } catch (err) {
    const start = text.length > 80 ? `${text.slice(0, 80)}…` : text;
    problems.push(
      `def_json is not valid JSON (${err instanceof Error ? err.message : 'parse error'}). It began: ${start} — give the whole definition as one valid JSON object, with every key and string in double quotes and no comments or trailing commas`,
    );
    return null;
  }
}

/** Under /api/public, with the code's hash in the name: cached for good, and a new version gets a new address. */
export const moduleUrl = (id: string, hash: string) => `/api/public/custom-blocks/${id}/${hash}.js`;
