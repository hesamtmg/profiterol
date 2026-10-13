import { compact } from './business.js';
import { locales } from './locales.js';

/** A site's search engine settings (Admin → Settings → SEO). Each site has its own. */
export interface SeoSettings {
  /** How page titles are written, per locale. `%s` is the page's title, `{site}` the site's name. */
  titleTemplate: Record<string, string>;
  /** Used when a page has no description of its own, per locale. */
  description: Record<string, string>;
  /** Shown when a page with no picture is shared; empty means the logo. */
  shareImage: string;
  /** The site's X (Twitter) account, without the @. */
  twitter: string;
  /** The codes search consoles ask you to add as a meta tag to prove the site is yours. */
  verification: { google: string; bing: string; yandex: string; baidu: string };
  /** Keeps the whole site out of search engines, e.g. while it is being built. */
  hideSite: boolean;
  /** Extra lines for robots.txt, e.g. "Disallow: /drafts". */
  robotsExtra: string;
  /** List collection pages (/en/projects) in the sitemap, not only their items. */
  collectionPages: boolean;
}

export const DEFAULT_TITLE_TEMPLATE = '%s · {site}';

export const emptySeo = (): SeoSettings => ({
  titleTemplate: {},
  description: {},
  shareImage: '',
  twitter: '',
  verification: { google: '', bing: '', yandex: '', baidu: '' },
  hideSite: false,
  robotsExtra: '',
  collectionPages: true,
});

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
/** Verification codes are letters, digits, - and _; anything else could break out of the meta tag. */
const code = (v: unknown) => str(v, 200).replace(/[^\w-]/g, '');

function perLocale(input: unknown, max: number): Record<string, string> {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return Object.fromEntries(locales.map((l) => [l.code, str(o[l.code], max)]).filter(([, v]) => v));
}

/** Robots lines a site may add: comments and the usual directives only, so it cannot inject anything else. */
const ROBOTS_LINE = /^(#.*|(user-agent|disallow|allow|crawl-delay|sitemap|host|clean-param)\s*:\s*[^\s<>]*)$/i;

/** Keeps only known fields, safe verification codes and well-formed robots.txt lines. */
export function cleanSeo(input: unknown): SeoSettings {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const v = (o.verification && typeof o.verification === 'object' ? o.verification : {}) as Record<string, unknown>;
  const image = str(o.shareImage, 500);
  return {
    titleTemplate: Object.fromEntries(Object.entries(perLocale(o.titleTemplate, 120)).filter(([, t]) => t.includes('%s'))),
    description: perLocale(o.description, 300),
    shareImage: /^(\/uploads\/|https:\/\/)[^\s<>"]+$/i.test(image) ? image : '',
    twitter: str(o.twitter, 40).replace(/^@/, '').replace(/[^\w]/g, ''),
    verification: { google: code(v.google), bing: code(v.bing), yandex: code(v.yandex), baidu: code(v.baidu) },
    hideSite: o.hideSite === true,
    robotsExtra: str(o.robotsExtra, 2000)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && ROBOTS_LINE.test(l))
      .slice(0, 50)
      .join('\n'),
    collectionPages: o.collectionPages !== false,
  };
}

/** A page's <title>: the site's pattern with the page title and site name filled in. The home page is the site name. */
export function seoTitle(seo: Partial<SeoSettings> | null | undefined, locale: string, title: string, siteName: string): string {
  if (!title || title === siteName) return siteName;
  const template = seo?.titleTemplate?.[locale] || DEFAULT_TITLE_TEMPLATE;
  return template.replace('%s', title).replace('{site}', siteName).trim();
}

/** The meta tags search consoles look for when you prove the site is yours. */
export function verificationMeta(seo: Partial<SeoSettings> | null | undefined): { name: string; content: string }[] {
  const v = seo?.verification;
  if (!v) return [];
  const names = {
    google: 'google-site-verification',
    bing: 'msvalidate.01',
    yandex: 'yandex-verification',
    baidu: 'baidu-site-verification',
  };
  return (Object.keys(names) as (keyof typeof names)[]).filter((k) => v[k]).map((k) => ({ name: names[k], content: v[k] }));
}

/** robots.txt for one site. */
export function robotsTxt(seo: Partial<SeoSettings> | null | undefined, origin: string): string {
  const lines = ['User-agent: *'];
  if (seo?.hideSite) lines.push('Disallow: /');
  else lines.push('Disallow: /admin', 'Disallow: /api');
  if (seo?.robotsExtra) lines.push('', seo.robotsExtra);
  lines.push('', `Sitemap: ${origin}/sitemap.xml`);
  return `${lines.join('\n')}\n`;
}

export interface Crumb {
  name: string;
  url: string;
}

/** "Home › Projects › Harbor portal" for search results. */
export function breadcrumbJsonLd(crumbs: Crumb[]): Record<string, unknown> | null {
  const list = crumbs.filter((c) => c.name && c.url);
  if (list.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: list.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
  };
}

export interface ArticleJsonLdInput {
  /** BlogPosting for blog-like collections, Article otherwise. */
  type: 'BlogPosting' | 'Article';
  url: string;
  headline: string;
  description: string;
  /** Absolute URL, or ''. */
  image: string;
  locale: string;
  published: string | Date | null;
  modified: string | Date | null;
  author: string;
  /** The site (or business) name, and its address. */
  publisher: string;
  origin: string;
}

const iso = (d: string | Date | null) => (d ? new Date(d).toISOString() : '');

/** Structured data for a collection item's page (a blog post, a project…). */
export function articleJsonLd(a: ArticleJsonLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    ...compact({
      '@type': a.type,
      '@id': `${a.url}#article`,
      mainEntityOfPage: a.url,
      headline: a.headline.slice(0, 110),
      description: a.description,
      image: a.image ? [a.image] : undefined,
      inLanguage: a.locale,
      datePublished: iso(a.published),
      dateModified: iso(a.modified || a.published),
      author: a.author ? { '@type': 'Person', name: a.author } : undefined,
      publisher: a.publisher ? { '@type': 'Organization', name: a.publisher, url: a.origin } : undefined,
      isPartOf: { '@id': `${a.origin}/#website` },
    }),
  };
}

// ---------- Sitemaps ----------

/** One address in a sitemap, with the same content in other languages and its pictures. */
export interface SitemapUrl {
  loc: string;
  lastmod?: string | Date | null;
  alternates?: { hreflang: string; href: string }[];
  images?: string[];
}

/** Escapes text for XML, numerically so it is valid in every XML parser. */
export function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Search engines accept up to 50,000 addresses per sitemap file. */
export const SITEMAP_LIMIT = 50_000;

export function sitemapXml(urls: SitemapUrl[]): string {
  const body = urls
    .map((u) => {
      const parts = [`<loc>${escapeXml(u.loc)}</loc>`];
      if (u.lastmod) parts.push(`<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>`);
      for (const a of u.alternates ?? []) {
        parts.push(`<xhtml:link rel="alternate" hreflang="${escapeXml(a.hreflang)}" href="${escapeXml(a.href)}"/>`);
      }
      for (const img of [...new Set(u.images ?? [])].slice(0, 1000)) {
        parts.push(`<image:image><image:loc>${escapeXml(img)}</image:loc></image:image>`);
      }
      return `<url>${parts.join('')}</url>`;
    })
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"' +
    ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${body}</urlset>`
  );
}

export function sitemapIndexXml(sitemaps: { loc: string; lastmod?: string | Date | null }[]): string {
  const body = sitemaps
    .map(
      (s) =>
        `<sitemap><loc>${escapeXml(s.loc)}</loc>${s.lastmod ? `<lastmod>${new Date(s.lastmod).toISOString()}</lastmod>` : ''}</sitemap>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}
