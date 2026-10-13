import { sitemapXml } from '@profiterol/blocks';

/** One sitemap of the index: /sitemaps/pages.xml, /sitemaps/projects.xml, /sitemaps/blog-2.xml… */
export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') ?? '';
  const { origin, groups } = await siteSitemap(event);
  const file = groups.flatMap((g) => sitemapFiles(origin, g)).find((f) => decodeURIComponent(f.name) === decodeURIComponent(name));
  if (!file) throw createError({ statusCode: 404, statusMessage: 'Not found' });
  setHeader(event, 'content-type', 'application/xml; charset=utf-8');
  return sitemapXml(file.urls);
});
