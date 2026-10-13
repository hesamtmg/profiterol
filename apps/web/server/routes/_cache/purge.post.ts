import { timingSafeEqual } from 'node:crypto';

/**
 * Called by the API after every change made in a site's admin, with that site's addresses (`{ hosts }`), or with
 * none to clear everything. Needs the shared NUXT_CACHE_PURGE_TOKEN.
 */
export default defineEventHandler(async (event) => {
  const token = useRuntimeConfig().cachePurgeToken;
  const given = getRequestHeader(event, 'x-purge-token') ?? '';
  if (!token || given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    throw createError({ statusCode: 404 });
  }
  const body = await readBody<{ hosts?: unknown }>(event).catch(() => null);
  const hosts = Array.isArray(body?.hosts) ? body.hosts.map((h) => String(h).toLowerCase()).slice(0, 100) : undefined;
  forgetRedirects(hosts);
  return { purged: purgePages(hosts) };
});
