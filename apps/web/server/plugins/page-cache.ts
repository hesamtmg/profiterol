/** Keeps successful renders of public pages in the page cache (server/utils/page-cache.ts). */
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:response', (response, { event }) => {
    const key = event.context.pageCacheKey as string | undefined;
    if (!key || response.statusCode !== 200 || typeof response.body !== 'string') return;
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries({ ...getResponseHeaders(event), ...(response.headers ?? {}) })) {
      if (value !== undefined && name.toLowerCase() !== 'set-cookie') headers[name] = String(value);
    }
    storePage(key, { status: 200, headers, body: response.body, at: Date.now() });
    setResponseHeader(event, 'x-page-cache', 'MISS');
  });
});
