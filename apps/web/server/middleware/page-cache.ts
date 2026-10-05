/** Answers from the page cache when it can (see server/utils/page-cache.ts). */
export default defineEventHandler((event) => {
  if (!pageCacheEnabled()) return;
  const key = cacheKey(event);
  const hit = key ? readPage(key) : null;
  if (!key) return;
  if (!hit) {
    event.context.pageCacheKey = key;
    return;
  }
  setResponseStatus(event, hit.status);
  setResponseHeaders(event, { ...hit.headers, 'x-page-cache': 'HIT' });
  return hit.body;
});
