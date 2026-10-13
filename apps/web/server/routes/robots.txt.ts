import { publicOrigin, robotsTxt, type SeoSettings } from '@profiterol/blocks';

/** Each site's own robots.txt (Admin → Settings → SEO), pointing at its sitemap on its main address. */
export default defineEventHandler(async (event) => {
  const settings = await $fetch<{ origin?: string; seo?: Partial<SeoSettings> }>('/public/settings', siteFetchOptions(event)).catch(
    () => null,
  );
  const origin = publicOrigin(settings?.origin, getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }));
  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return robotsTxt(settings?.seo, origin);
});
