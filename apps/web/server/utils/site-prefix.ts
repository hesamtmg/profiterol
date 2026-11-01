import type { H3Event } from 'h3';

/** The only paths a site can be served under besides its own address's root (preview sites, see nginx). */
const PREFIX = /^\/preview\/[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/**
 * The path this request's site is served under: /preview/<name> for a preview site, '' otherwise. nginx strips it
 * from the address and sends it as X-Site-Prefix (always overwriting whatever the visitor sent), so the app sees
 * ordinary paths (/fa, /admin) and only has to add it back to the links it makes.
 */
export function sitePrefix(event: H3Event): string {
  const prefix = String(getRequestHeader(event, 'x-site-prefix') ?? '').trim();
  return PREFIX.test(prefix) ? prefix : '';
}
