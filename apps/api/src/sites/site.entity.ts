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

/**
 * Whether the site should have a certificate. The owner decides: nothing is asked of Let's Encrypt until they choose
 * "Issue SSL" (or tick it when adding the site).
 */
export type SslMode = 'off' | 'requested';

/**
 * Where the site's certificate is:
 * - none: no certificate wanted, or not asked for yet
 * - queued: waiting for the domains agent to pick it up
 * - running: the agent is working on it (see the site's SSL events)
 * - active: a valid certificate is installed
 * - failed: the last attempt failed (sslMessage says why); retried a few times, then waits for the owner
 */
export type SslState = 'none' | 'queued' | 'running' | 'active' | 'failed';

/** The admin panel's language when the person has not picked one in their browser. Empty: follow the browser. */
export type AdminLang = '' | 'en' | 'fa';
export const ADMIN_LANGS: AdminLang[] = ['', 'en', 'fa'];

/** One website: its own pages, collections, media, settings, inbox, redirects and users. */
@Entity('sites')
export class Site {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Internal name in the owner's Sites list. */
  @Column({ default: '' })
  name: string;

  @OneToMany(() => SiteDomain, (d) => d.site, { cascade: true, eager: true })
  domains: SiteDomain[];

  /** The language the site's admin panel opens in, chosen by the owner (see AdminLang). */
  @Column({ type: 'varchar', length: 8, default: '' })
  adminLang: AdminLang;

  /** The sublimation (textile) designer block and Admin → Print orders. Only owners turn it on, site by site. */
  @Column({ default: false })
  printDesigner: boolean;

  /**
   * Whether the site's own admins may change its search engine settings, sitemap and robots.txt (Admin → SEO). When
   * the owner turns it off, only owners can, and the site keeps the settings it has.
   */
  @Column({ default: true })
  seoAllowed: boolean;

  /**
   * A preview made for someone thinking of buying a site: served at <PREVIEW_URL>/preview/<previewSlug> instead of
   * its own address, hidden from search engines, and offline once `expiresAt` has passed. Converting it to a real
   * site gives it addresses and clears this (the slug is kept, so old preview links redirect to the new address).
   */
  @Column({ default: false })
  preview: boolean;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40, nullable: true })
  previewSlug: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  /** Who the preview is for, and the notes of whoever made it. */
  @Column({ type: 'text', default: '' })
  prospect: string;

  /**
   * The site a preview was made by, and whose address it lives under (<its address>/preview/<slug>). Empty for the
   * owners' own previews, which live on PREVIEW_URL. Deleting that site deletes its previews.
   */
  @ManyToOne(() => Site, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'previewHostId' })
  previewHost: Site | null;

  @Column({ type: 'uuid', nullable: true })
  previewHostId: string | null;

  /** The address the preview's maker asked the owners to move it to, once the customer bought it. */
  @Column({ type: 'varchar', length: 253, nullable: true })
  convertRequest: string | null;

  /** Whether the owner lets this site's admins make previews of their own (under this site's address). */
  @Column({ default: false })
  previewsAllowed: boolean;

  /** How many previews this site may have online at once (ended ones do not count). */
  @Column({ type: 'int', default: 5 })
  previewMax: number;

  /** The longest one of this site's previews may stay online, counted from when it was made, extensions included. */
  @Column({ type: 'int', default: 30 })
  previewMaxDays: number;

  @Column({ type: 'varchar', length: 16, default: 'off' })
  sslMode: SslMode;

  @Column({ type: 'varchar', length: 16, default: 'none' })
  ssl: SslState;

  /** The last step's message: why it failed, or what is happening now. */
  @Column({ type: 'text', default: '' })
  sslMessage: string;

  /** When the certificate expires (read from the certificate by the agent). */
  @Column({ type: 'timestamptz', nullable: true })
  sslExpires: Date | null;

  /** Failed attempts in a row; the agent retries automatically a few times, with growing waits. */
  @Column({ type: 'int', default: 0 })
  sslAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  sslRetryAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/** An address of a site. The primary one is the site's real address; the others (e.g. www.) redirect to it. */
@Entity('site_domains')
export class SiteDomain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Site, (s) => s.domains, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siteId' })
  site: Site;

  @Column({ type: 'uuid' })
  siteId: string;

  /** Lowercase, without port or trailing dot, e.g. example.com. */
  @Index({ unique: true })
  @Column({ length: 253 })
  domain: string;

  @Column({ default: false })
  primary: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

export type SslStep = 'queued' | 'dns' | 'challenge' | 'certificate' | 'nginx' | 'reload' | 'verify' | 'renewed' | 'removed';
export type SslStepState = 'running' | 'ok' | 'failed';

/** One step of getting (or renewing) a site's certificate, shown as a timeline in Admin → Sites. */
@Entity('ssl_events')
@Index(['siteId', 'createdAt'])
export class SslEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'siteId' })
  site: Site;

  @Column({ type: 'uuid' })
  siteId: string;

  @Column({ type: 'varchar', length: 16 })
  step: SslStep;

  @Column({ type: 'varchar', length: 16 })
  state: SslStepState;

  @Column({ type: 'text', default: '' })
  message: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'clock_timestamp()' })
  createdAt: Date;
}
