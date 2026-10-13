import type { BlockNode, BusinessInfo, LoaderSettings, SavedTheme, SeoSettings, SiteFont, ThemeTokens } from '@profiterol/blocks';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Site } from '../sites/site.entity';

/** A configured block (with its columns, if any) kept under a name. */
export interface SavedSection {
  key: string;
  name: string;
  block: BlockNode;
  createdAt: string;
}

/** Text keyed by locale code, e.g. `{ fa: 'خانه', en: 'Home' }`. */
export type Localized = Record<string, string>;

export interface MenuItem {
  label: Localized;
  /** A page slug (without locale) or an anchor / absolute URL. */
  href: string;
}

/** Site-wide settings: one row per site. */
@Entity('site_settings')
export class SiteSettings {
  @PrimaryColumn({ type: 'uuid' })
  siteId: string;

  @OneToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siteId' })
  site?: Site;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  siteName: Localized;

  @Column({ default: '' })
  logo: string;

  @Column({ default: '' })
  favicon: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  theme: Partial<ThemeTokens>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  menu: MenuItem[];

  /** Fonts uploaded to the media library, usable in themes. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  fonts: SiteFont[];

  /** Themes saved under the owner's own names. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  savedThemes: SavedTheme[];

  /** The loading screen shown while the site opens. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  loader: Partial<LoaderSettings>;

  /** Blocks saved to reuse on other pages ("Saved sections" in the editor's library). Not sent to the site. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  sections: SavedSection[];

  @Column({ default: false })
  maintenance: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  maintenanceText: Localized;

  /** What the site's owner is (a café, a law firm, a person…) and how to reach them, for search engines. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  business: Partial<BusinessInfo>;

  /** Search engine settings: title pattern, default description and share picture, verification codes, robots.txt. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  seo: Partial<SeoSettings>;

  /** Where new form messages are emailed (needs SMTP_URL). Empty means inbox only. */
  @Column({ default: '' })
  notifyEmail: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
