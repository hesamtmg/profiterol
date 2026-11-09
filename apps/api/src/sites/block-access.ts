import { BadRequestException, Body, Controller, Get, Injectable, Put, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { blocks as blockDefs, type BlockNode } from '@profiterol/blocks';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Column, Entity, In, PrimaryColumn, Repository, UpdateDateColumn } from 'typeorm';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { Site } from './site.entity';

/**
 * Which sites may use a built-in block. A block with no row here is on every site (so new blocks and new sites work
 * as before); a block with a row is only on the sites listed, chosen by the owner in Admin → Components.
 */
@Entity('block_access')
export class BlockAccess {
  /** The block type, e.g. "pricing". */
  @PrimaryColumn({ type: 'varchar', length: 80 })
  type: string;

  /** The sites that may add this block to their pages. Empty: none. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  siteIds: string[];

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

const CACHE_MS = 30_000;
const builtIn = new Set(blockDefs.map((b) => b.type));

/** Every block type used in these blocks, inside columns too. */
export function blockTypesIn(blocks: unknown, into = new Set<string>()): Set<string> {
  if (!Array.isArray(blocks)) return into;
  for (const b of blocks as BlockNode[]) {
    if (typeof b?.type === 'string') into.add(b.type);
    if (Array.isArray(b?.children)) for (const column of b.children) blockTypesIn(column, into);
  }
  return into;
}

/** Leaves out the blocks (inside columns too) whose type is in `types`. */
export function withoutTypes(blocks: BlockNode[], types: string[]): BlockNode[] {
  if (!types.length) return blocks;
  return blocks
    .filter((b) => !types.includes(b.type))
    .map((b) => (b.children ? { ...b, children: b.children.map((column) => withoutTypes(column, types)) } : b));
}

@Injectable()
export class BlockAccessService {
  private cache: { rules: Map<string, string[]>; at: number } | null = null;

  constructor(
    @InjectRepository(BlockAccess) private readonly access: Repository<BlockAccess>,
    @InjectRepository(Site) private readonly sites: Repository<Site>,
  ) {}

  /** Restricted block types and the sites allowed each one. Cached briefly; changes here clear it at once. */
  async rules(): Promise<Map<string, string[]>> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.rules;
    const rows = await this.access.find();
    const rules = new Map(rows.filter((r) => builtIn.has(r.type)).map((r) => [r.type, r.siteIds ?? []]));
    this.cache = { rules, at: Date.now() };
    return rules;
  }

  /** The built-in blocks this site may not add to its pages. */
  async hiddenFor(siteId: string): Promise<string[]> {
    return [...(await this.rules())].filter(([, ids]) => !ids.includes(siteId)).map(([type]) => type);
  }

  /**
   * Applies the owner's changes. `siteIds: null` puts the block back on every site (now and future ones); a list
   * keeps it to those sites only.
   */
  async apply(changes: { type: string; siteIds: string[] | null }[]) {
    const unknown = changes.find((c) => !builtIn.has(c.type));
    if (unknown) throw new BadRequestException(`"${unknown.type}" is not a built-in block`);
    const ids = [...new Set(changes.flatMap((c) => c.siteIds ?? []))];
    const found = ids.length ? await this.sites.count({ where: { id: In(ids) } }) : 0;
    if (found !== ids.length) throw new BadRequestException('One of the sites does not exist');
    const open = changes.filter((c) => c.siteIds === null).map((c) => c.type);
    if (open.length) await this.access.delete({ type: In(open) });
    const limited = changes.filter((c) => c.siteIds !== null);
    if (limited.length) await this.access.save(limited.map((c) => ({ type: c.type, siteIds: [...new Set(c.siteIds)] })));
    this.cache = null;
  }

  /** For each site, the block types its pages use now (drafts or published), so the owner sees what a change touches. */
  async usage(): Promise<Record<string, Record<string, number>>> {
    const rows: { siteId: string; blocks: unknown; publishedBlocks: unknown }[] = await this.access.manager.query(
      `SELECT "siteId", "blocks", "publishedBlocks" FROM "page_translations"`,
    );
    const usage: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      const types = blockTypesIn(row.publishedBlocks, blockTypesIn(row.blocks));
      const site = (usage[row.siteId] ??= {});
      for (const t of types) if (builtIn.has(t)) site[t] = (site[t] ?? 0) + 1;
    }
    return usage;
  }
}

class AccessChangeDto {
  @IsString()
  @MaxLength(80)
  type: string;

  /** null: every site. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('all', { each: true })
  siteIds: string[] | null;
}

class AccessChangesDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AccessChangeDto)
  changes: AccessChangeDto[];
}

/** Admin → Components: the owner decides which sites may use each built-in block. */
@Controller('admin/block-access')
@UseGuards(AuthGuard)
@Roles('owner')
export class BlockAccessController {
  constructor(private readonly access: BlockAccessService) {}

  /** The restricted blocks (type → allowed site ids) and how many pages of each site use each block. */
  @Get()
  async get() {
    return { rules: Object.fromEntries(await this.access.rules()), usage: await this.access.usage() };
  }

  @Put()
  async put(@Body() dto: AccessChangesDto) {
    await this.access.apply(dto.changes.map((c) => ({ type: c.type, siteIds: c.siteIds ?? null })));
    return this.get();
  }
}
