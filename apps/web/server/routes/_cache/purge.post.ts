import { timingSafeEqual } from 'node:crypto';

/** Called by the API after every change made in the admin. Needs the shared NUXT_CACHE_PURGE_TOKEN. */
export default defineEventHandler((event) => {
  const token = useRuntimeConfig().cachePurgeToken;
  const given = getRequestHeader(event, 'x-purge-token') ?? '';
  if (!token || given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    throw createError({ statusCode: 404 });
  }
  return { purged: purgePages() };
});
