import type { BlockNode, ThemeTokens } from '@profiterol/blocks';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type PageStatus = 'draft' | 'published';

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Internal name shown in the admin list. */
  @Column()
  name: string;

  @Column({ default: false })
  isHome: boolean;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: PageStatus;

  /** Draft of this page's own theme on top of the site theme; null means it uses the site theme as is. */
  @Column({ type: 'jsonb', nullable: true })
  theme: Partial<ThemeTokens> | null;

  /** The page theme visitors see; Publish copies `theme` here. */
  @Column({ type: 'jsonb', nullable: true })
  publishedTheme: Partial<ThemeTokens> | null;

  @OneToMany(() => PageTranslation, (t) => t.page, { cascade: true, eager: true })
  translations: PageTranslation[];

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  /** When set, the draft is published at this time (then cleared). */
  @Column({ type: 'timestamptz', nullable: true })
  publishAt: Date | null;

  /** When set, the page is taken offline at this time (then cleared). */
  @Column({ type: 'timestamptz', nullable: true })
  unpublishAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/** One language version of a page. `blocks` is the working draft; `publishedBlocks` is what visitors see. */
@Entity('page_translations')
@Index(['locale', 'slug'], { unique: true })
@Index(['page', 'locale'], { unique: true })
export class PageTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Page, (p) => p.translations, { onDelete: 'CASCADE' })
  page: Page;

  @Column({ length: 8 })
  locale: string;

  @Column({ default: '' })
  title: string;

  @Column({ default: '' })
  slug: string;

  @Column({ default: '' })
  seoTitle: string;

  @Column({ default: '' })
  seoDescription: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  blocks: BlockNode[];

  @Column({ type: 'jsonb', nullable: true })
  publishedBlocks: BlockNode[] | null;
}

/** Everything an editor can change on a page, as it was at one moment. */
export interface PageSnapshot {
  name: string;
  theme: Partial<ThemeTokens> | null;
  translations: { locale: string; title: string; slug: string; seoTitle: string; seoDescription: string; blocks: BlockNode[] }[];
}

export type RevisionKind = 'save' | 'publish' | 'restore';

/**
 * A saved version of a page. Every publish is kept; while editing, one version is kept per 10 minutes of work
 * (later saves update the latest one). Old versions beyond the limit are removed.
 */
@Entity('page_revisions')
@Index(['page', 'createdAt'])
export class PageRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Page, { onDelete: 'CASCADE' })
  page: Page;

  @Column({ type: 'varchar', length: 16 })
  kind: RevisionKind;

  /** Email of whoever made the change ('' for the scheduler). */
  @Column({ default: '' })
  author: string;

  @Column({ type: 'jsonb' })
  snapshot: PageSnapshot;

  // clock_timestamp(), not now(): versions saved in one transaction (a restore) must still sort in order.
  @CreateDateColumn({ type: 'timestamptz', default: () => 'clock_timestamp()' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
