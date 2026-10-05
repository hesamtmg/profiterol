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
};
