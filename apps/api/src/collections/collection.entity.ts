import type { FieldDef } from '@profiterol/blocks';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Site } from '../sites/site.entity';
import type { Localized } from '../settings/settings.entity';

/** A content type such as "projects" or "blog", with its own custom fields. */
@Entity('collections')
@Index(['siteId', 'key'], { unique: true })
export class Collection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siteId' })
  site?: Site;

  @Column({ type: 'uuid' })
  siteId: string;

  /** Stable machine name, used by collection-list blocks; unique within the site. */
  @Column({ length: 40 })
  key: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  name: Localized;

  /** The URL segment per locale, e.g. `{ en: 'projects', fa: 'پروژه‌ها' }` → `/en/projects/<item>`. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  slugs: Localized;

  /** Extra fields every item has, beyond title, excerpt, body, tags and cover. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  fields: FieldDef[];

  @OneToMany(() => CollectionItem, (i) => i.collection)
  items: CollectionItem[];

  /** Filled by list queries. */
  itemCount?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

export type ItemStatus = 'draft' | 'published';

@Entity('collection_items')
@Index(['collection', 'status', 'publishedAt'])
export class CollectionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Collection, (c) => c.items, { onDelete: 'CASCADE' })
  collection: Collection;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: ItemStatus;

  /** Card and header image, shared by every language. */
  @Column({ default: '' })
  cover: string;

  /** Hidden from search engines: a noindex tag, and left out of the sitemap. */
  @Column({ default: false })
  noindex: boolean;

  @OneToMany(() => ItemTranslation, (t) => t.item, { cascade: true, eager: true })
  translations: ItemTranslation[];

  /** Set the first time the item is published; lists are sorted by it, newest first. */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/** One language version of an item. */
@Entity('collection_item_translations')
@Index(['collectionId', 'locale', 'slug'], { unique: true })
@Index(['item', 'locale'], { unique: true })
export class ItemTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CollectionItem, (i) => i.translations, { onDelete: 'CASCADE' })
  item: CollectionItem;

  /** Copied from the item so slugs can be unique per collection. */
  @Column({ type: 'uuid' })
  collectionId: string;

  @Column({ length: 8 })
  locale: string;

  @Column({ default: '' })
  title: string;

  @Column({ default: '' })
  slug: string;

  @Column({ type: 'text', default: '' })
  excerpt: string;

  @Column({ type: 'text', default: '' })
  body: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  tags: string[];

  /** Values for the collection's custom fields. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  data: Record<string, unknown>;

  @Column({ default: '' })
  seoDescription: string;
}
