import { locales } from '@profiterol/blocks';

/** Answers from the API's redirect list, remembered for a few minutes (and cleared with the page cache). */
const known = new Map<string, { to: string; status: number } | null>();
const MAX = 2000;
const TTL = 5 * 60_000;
let filledAt = Date.now();

export async function findRedirect(path: string): Promise<{ to: string; status: number } | null> {
  if (Date.now() - filledAt > TTL) forgetRedirects();
  if (known.has(path)) return known.get(path)!;
  let found: { to: string; status: number } | null = null;
  try {
    found = await $fetch<{ to: string; status: number }>('/public/redirect', {
      baseURL: useRuntimeConfig().apiInternal,
      query: { path },
      timeout: 3000,
    });
  } catch {
    found = null;
  }
  if (known.size >= MAX) known.clear();
  known.set(path, found);
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

export function forgetRedirects() {
  known.clear();
  filledAt = Date.now();
}

/** Addresses that are never pages: anything outside a language prefix, except the site's own files and routes. */
const OWN = /^\/(_nuxt|_cache|api|uploads|admin|healthz|robots\.txt|sitemap\.xml|favicon\.ico|__nuxt)(\/|$)/;
const LOCALE = new RegExp(`^/(${locales.map((l) => l.code).join('|')})(/|$)`);
export const outsidePages = (path: string) => path !== '/' && !OWN.test(path) && !LOCALE.test(path);
