export default defineEventHandler((event) => {
  const origin = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin;
  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return `User-agent: *\nDisallow: /admin\nDisallow: /api\nSitemap: ${origin}/sitemap.xml\n`;
});
