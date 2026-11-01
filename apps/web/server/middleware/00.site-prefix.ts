/**
 * A preview site is served under /preview/<name> on another site's address (see server/utils/site-prefix.ts).
 * This request's copy of the runtime config gets that path as the app's base, so the router, its links and
 * redirects, and the browser's API calls all stay under it; the page passes the same config to the browser.
 * The built files (/_nuxt) are still served from the root.
 */
export default defineEventHandler((event) => {
  const prefix = sitePrefix(event);
  if (!prefix) return;
  const config = useRuntimeConfig(event);
  config.app.baseURL = `${prefix}/`;
  config.public.apiBase = `${prefix}/api`;
  config.public.sitePrefix = prefix;
  // Shown to search engines only through the main site's address; a preview is never indexed.
  setResponseHeader(event, 'x-robots-tag', 'noindex, nofollow');
});
