/**
 * Turns a YouTube or Aparat page link into an embeddable player URL.
 * Returns null for anything else, so only these two hosts are ever embedded.
 */
export function videoEmbedUrl(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^www\.|^m\./, '');
  const id = (v: string | null | undefined) => (v && /^[\w-]{4,40}$/.test(v) ? v : null);

  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const v = id(url.searchParams.get('v')) ?? id(url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1]);
    return v ? `https://www.youtube-nocookie.com/embed/${v}` : null;
  }
  if (host === 'youtu.be') {
    const v = id(url.pathname.slice(1));
    return v ? `https://www.youtube-nocookie.com/embed/${v}` : null;
  }
  if (host === 'aparat.com') {
    const v = id(url.pathname.match(/^\/v\/([^/]+)/)?.[1]) ?? id(url.pathname.match(/videohash\/([^/]+)/)?.[1]);
    return v ? `https://www.aparat.com/video/video/embed/videohash/${v}/vt/frame` : null;
  }
  return null;
}
