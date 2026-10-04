import type { ThemeTokens } from '@profiterol/blocks';
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Text keyed by locale code, e.g. `{ fa: 'خانه', en: 'Home' }`. */
export type Localized = Record<string, string>;

export interface MenuItem {
  label: Localized;
  /** A page slug (without locale) or an anchor / absolute URL. */
  href: string;
}

/** Site-wide settings. There is exactly one row, with id 1. */
@Entity('site_settings')
export class SiteSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

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

  @Column({ default: false })
  maintenance: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  maintenanceText: Localized;

  /** Where new form messages are emailed (needs SMTP_URL). Empty means inbox only. */
  @Column({ default: '' })
  notifyEmail: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
