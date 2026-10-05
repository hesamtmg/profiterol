import { locales } from '@profiterol/blocks';
import type { H3Event } from 'h3';

/**
 * Rendered public pages, kept in memory so visitors are not waiting for a render each time. The API clears the
 * whole cache after every change in the admin (POST /_cache/purge), and entries expire after `pageCacheSeconds`
 * anyway (scheduled publishing, collection lists). One cache per web process.
 */
export interface CachedPage {
  status: number;
  headers: Record<string, string>;
  body: string;
  at: number;
}

const MAX_ENTRIES = 500;
const pages = new Map<string, CachedPage>();
const LOCALE_PATH = new RegExp(`^/(${locales.map((l) => l.code).join('|')})(/|$)`);

export function pageCacheEnabled() {
  return Boolean(useRuntimeConfig().cachePurgeToken);
}

/** Only plain visits to public pages: no query string, no admin session. */
export function cacheKey(event: H3Event): string | null {
  if (event.method !== 'GET' && event.method !== 'HEAD') return null;
  const url = event.path;
  if (url.includes('?') || !LOCALE_PATH.test(url)) return null;
  if ((getRequestHeader(event, 'cookie') ?? '').includes('pt_session=')) return null;
  return url;
}

export function readPage(key: string): CachedPage | null {
  const entry = pages.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > useRuntimeConfig().pageCacheSeconds * 1000) {
    pages.delete(key);
    return null;
  }
  return entry;
}

export function storePage(key: string, entry: CachedPage) {
  if (pages.size >= MAX_ENTRIES) pages.delete(pages.keys().next().value!);
  pages.set(key, entry);
}

export function purgePages() {
  const count = pages.size;
  pages.clear();
  return count;
}
