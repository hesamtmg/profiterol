import { publicOrigin, robotsTxt, type SeoSettings } from '@profiterol/blocks';

/** Each site's own robots.txt (Admin → SEO), made from its settings or written by the site, pointing at its sitemap. */
export default defineEventHandler(async (event) => {
  const settings = await $fetch<{ origin?: string; seo?: Partial<SeoSettings>; previewHome?: string }>(
    '/public/settings',
    siteFetchOptions(event),
  ).catch(() => null);
  const origin = publicOrigin(settings?.origin, getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }));
  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  // Preview sites (/preview/<name>) live on this address but are never indexed.
  return robotsTxt(settings?.seo, origin, { previews: !!settings?.previewHome && !sitePrefix(event) });
});
