import { defaultLocale, publicOrigin, SITEMAP_LIMIT, type SitemapUrl } from '@profiterol/blocks';
import type { H3Event } from 'h3';

export interface SitemapGroup {
  /** 'pages', or a collection's key. */
  group: string;
  entries: { updatedAt: string; paths: { locale: string; path: string }[]; images: string[] }[];
}

/** What a site's sitemaps are made from: its address (the main one, https when it has a certificate) and content. */
export async function siteSitemap(event: H3Event) {
  const opts = siteFetchOptions(event);
  const [settings, groups] = await Promise.all([
    $fetch<{ origin?: string; seo?: { hideSite?: boolean } }>('/public/settings', opts),
    $fetch<SitemapGroup[]>('/public/sitemap', opts),
  ]);
  const origin = publicOrigin(settings.origin, getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }));
  // A hidden site lists nothing, so search engines are not invited to pages they must not index.
  return { origin, groups: settings.seo?.hideSite ? [] : groups.filter((g) => g.entries.length) };
}

/** Encoded like the pages' canonical links, so both name the same URL (Persian slugs included). */
const pageUrl = (origin: string, locale: string, path: string) => `${origin}/${locale}${path ? `/${encodeURI(path)}` : ''}`;

/** One <url> per language of each page or item, each listing all its languages (and x-default) as alternates. */
export function sitemapUrls(origin: string, group: SitemapGroup): SitemapUrl[] {
  return group.entries.flatMap((e) => {
    const alternates =
      e.paths.length > 1
        ? [
            ...e.paths.map((p) => ({ hreflang: p.locale, href: pageUrl(origin, p.locale, p.path) })),
            ...e.paths
              .filter((p) => p.locale === defaultLocale)
              .map((p) => ({ hreflang: 'x-default', href: pageUrl(origin, p.locale, p.path) })),
          ]
        : [];
    const images = e.images.map((src) => new URL(src, origin).href);
    return e.paths.map((p) => ({ loc: pageUrl(origin, p.locale, p.path), lastmod: e.updatedAt, alternates, images }));
  });
}

/** A group's sitemap files: one, or several when it has more addresses than a sitemap may hold. */
export function sitemapFiles(origin: string, group: SitemapGroup) {
  const urls = sitemapUrls(origin, group);
  const files: { name: string; urls: SitemapUrl[]; lastmod: string }[] = [];
  for (let i = 0; i * SITEMAP_LIMIT < Math.max(urls.length, 1); i++) {
    const part = urls.slice(i * SITEMAP_LIMIT, (i + 1) * SITEMAP_LIMIT);
    const lastmod = part.reduce((max, u) => (String(u.lastmod) > max ? String(u.lastmod) : max), '');
    files.push({ name: `${encodeURIComponent(group.group)}${i ? `-${i + 1}` : ''}.xml`, urls: part, lastmod });
  }
  return files;
}
