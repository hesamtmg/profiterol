import type {
  BlockNode,
  BusinessInfo,
  HeaderSettings,
  LoaderSettings,
  SavedTheme,
  SeoSettings,
  SiteFont,
  ThemeTokens,
} from '@profiterol/blocks';
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

  /** The header's button and placement (its look is the theme's header style). */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  header: Partial<HeaderSettings>;

  /** Fonts uploaded to the media library, usable in themes. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  fonts: SiteFont[];

  /** Themes saved under the owner's own names. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  savedThemes: SavedTheme[];

  /** The loading screen shown while the site opens. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  loader: Partial<LoaderSettings>;

  /** CSS added after the theme on every page of the site (cleaned by cleanCss). */
  @Column({ type: 'text', default: '' })
  customCss: string;

  /** HTML tags added to the end of every page's <head> (analytics, verification tags…). Only owners set it. */
  @Column({ type: 'text', default: '' })
  headHtml: string;

  /** HTML added at the end of every page's <body> (chat widgets, <noscript> pixels…). Only owners set it. */
  @Column({ type: 'text', default: '' })
  bodyHtml: string;

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

  /**
   * The language visitors land on at the site's root address. Empty: their browser's language when the site has it,
   * else the built-in default. Also the hreflang x-default.
   */
  @Column({ type: 'varchar', length: 8, default: '' })
  defaultLocale: string;

  /** Where new form messages are emailed (needs SMTP_URL). Empty means inbox only. */
  @Column({ default: '' })
  notifyEmail: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
