import { locales } from '@profiterol/blocks';

/**
 * Answers from the API's redirect lists (one per site), remembered for a few minutes and cleared with the page
 * cache. Keys are `host` + path.
 */
const known = new Map<string, { to: string; status: number } | null>();
const MAX = 2000;
const TTL = 5 * 60_000;
let filledAt = Date.now();

export async function findRedirect(host: string, path: string): Promise<{ to: string; status: number } | null> {
  if (Date.now() - filledAt > TTL) forgetRedirects();
  const key = host + path;
  if (known.has(key)) return known.get(key)!;
  let found: { to: string; status: number } | null = null;
  try {
    found = await $fetch<{ to: string; status: number }>('/public/redirect', {
      baseURL: useRuntimeConfig().apiInternal,
      headers: { 'x-forwarded-host': host },
      query: { path },
      timeout: 3000,
    });
  } catch {
    found = null;
  }
  if (known.size >= MAX) known.clear();
  known.set(key, found);
  return found;
}

/** A Location header carries only ASCII: Persian addresses are sent percent-encoded (once). */
export function headerSafe(url: string) {
  try {
    return encodeURI(decodeURI(url));
  } catch {
    return encodeURI(url);
  }
}

/** Forgets these sites' answers (by address), or everything. */
export function forgetRedirects(hosts?: string[]) {
  if (!hosts) {
    known.clear();
    filledAt = Date.now();
    return;
  }
  for (const key of known.keys()) if (hosts.some((h) => key.startsWith(`${h}/`))) known.delete(key);
}

/** Addresses that are never pages: anything outside a language prefix, except the site's own files and routes. */
const OWN = /^\/(_nuxt|_cache|api|uploads|admin|healthz|robots\.txt|sitemap\.xml|sitemaps|favicon\.ico|__nuxt)(\/|$)/;
const LOCALE = new RegExp(`^/(${locales.map((l) => l.code).join('|')})(/|$)`);
export const outsidePages = (path: string) => path !== '/' && !OWN.test(path) && !LOCALE.test(path);
