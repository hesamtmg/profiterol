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
