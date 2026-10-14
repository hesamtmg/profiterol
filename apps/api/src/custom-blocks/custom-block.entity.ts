import type { BlockDef } from '@profiterol/blocks';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { AttachmentInfo } from '../ai/attachments';
import { Site } from '../sites/site.entity';

/**
 * - draft: built (by the AI or by hand) but never approved; only the builder's sandboxed preview runs it
 * - live: approved by the owner; in the editor's block list and on the site
 * - disabled: taken out of use; pages that still have it show nothing in its place
 */
export type CustomBlockStatus = 'draft' | 'live' | 'disabled';

/** A compiled version of a block: its definition (fields and defaults) and its browser module. */
export interface CustomBlockVersion {
  def: BlockDef;
  source: string;
  compiled: string;
  hash: string;
}

/** A block the site's admin had the AI build (see CustomBlocksService). Changes stay in the draft until approved. */
@Entity('custom_blocks')
@Index('IDX_custom_blocks_site_type', ['siteId', 'type'], { unique: true })
export class CustomBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  siteId: string;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siteId' })
  site?: Site;

  /** The block type used in pages, e.g. "ai-pricing-table-k3f2". Never changes. */
  @Column({ type: 'varchar', length: 80 })
  type: string;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: CustomBlockStatus;

  /** The version being worked on in the builder. */
  @Column({ type: 'jsonb' })
  draft: CustomBlockVersion;

  /** The approved version pages use. Null until the first approval. */
  @Column({ type: 'jsonb', nullable: true })
  live: CustomBlockVersion | null;

  /** The conversation with the AI, so later requests ("make the title bigger") build on the earlier ones. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  /**
   * Text only: `model` says which of the admin's AI models answered, `attachments` what was attached to a request
   * (names and small previews; the files themselves are sent once and not kept).
   */
  conversation: {
    role: 'user' | 'assistant';
    content: string;
    at: string;
    author?: string;
    model?: string;
    attachments?: AttachmentInfo[];
  }[];

  @Column({ default: '' })
  createdBy: string;

  @Column({ default: '' })
  approvedBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
