import { sitemapIndexXml } from '@profiterol/blocks';

/** The site's sitemap index: one sitemap for its pages and one per collection (see sitemaps/[name].ts). */
export default defineEventHandler(async (event) => {
  const { origin, groups } = await siteSitemap(event);
  const files = groups.flatMap((g) => sitemapFiles(origin, g));
  setHeader(event, 'content-type', 'application/xml; charset=utf-8');
  return sitemapIndexXml(files.map((f) => ({ loc: `${origin}/sitemaps/${f.name}`, lastmod: f.lastmod || null })));
});
