import { resolve } from 'node:path';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: required('DATABASE_URL', 'postgres://profiterol:profiterol@localhost:5432/profiterol'),
  // Off by default: tables are created and updated by migrations.
  dbSync: process.env.DB_SYNC === 'true',
  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev-only-secret'),
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@example.com',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin12345',
  uploadDir: resolve(process.env.UPLOAD_DIR ?? './uploads'),
  /** AVIF copies of photos (smaller than WebP, slower to make). Set IMAGE_AVIF=false to skip them. */
  imageAvif: process.env.IMAGE_AVIF !== 'false',
  /** The site's public address, e.g. https://example.com — used in emailed links (password reset, invitations). */
  siteUrl: (process.env.SITE_URL ?? '').replace(/\/$/, ''),
  /** e.g. smtps://user:pass@smtp.example.com:465 — leave empty to keep form messages in the inbox only. */
  smtpUrl: process.env.SMTP_URL ?? '',
  /** The web app's page cache is cleared through this address after every change in the admin. */
  webInternalUrl: (process.env.WEB_INTERNAL_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  /** Shared with the web app (NUXT_CACHE_PURGE_TOKEN); without it the web app does not cache pages. */
  cachePurgeToken: process.env.CACHE_PURGE_TOKEN ?? '',
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  smtpFrom: process.env.SMTP_FROM || 'Profiterol <no-reply@localhost>',
  /** The first site's address and its other names, given to it on first start (see SeedService). */
  domain: (process.env.DOMAIN ?? '').trim(),
  extraDomains: (process.env.EXTRA_DOMAINS ?? '').split(/[\s,]+/).filter(Boolean),
  /** Shared with the domains agent (docker/domains), which calls /api/internal/*. Without it those routes are off. */
  internalToken: process.env.INTERNAL_TOKEN ?? '',
  /**
   * Lets the AI block builder read websites on private networks and any port ("Copy from a website"). Off: an admin
   * could otherwise make the API fetch addresses on its own network. Only for tests and trusted setups.
   */
  siteImportAllowPrivate: process.env.SITE_IMPORT_ALLOW_PRIVATE === 'true',
};
