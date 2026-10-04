interface Entry {
  locale: string;
  slug: string;
  updatedAt: string;
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const origin = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin;
  const entries = await $fetch<Entry[]>(`${config.apiInternal}/public/sitemap`);

  const urls = entries
    .map((e) => {
      const path = `/${e.locale}${e.slug ? `/${encodeURI(e.slug)}` : ''}`;
      return `<url><loc>${escapeXml(origin + path)}</loc><lastmod>${new Date(e.updatedAt).toISOString()}</lastmod></url>`;
    })
    .join('');

  setHeader(event, 'content-type', 'application/xml; charset=utf-8');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
});
