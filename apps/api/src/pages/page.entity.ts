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
