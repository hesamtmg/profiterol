import { randomBytes } from 'node:crypto';

/**
 * Content-Security-Policy for the site and the admin. Scripts must come from this site, or be inline scripts that
 * Nuxt (or a block like the page loader) wrote into this very response: each response gets a fresh nonce that is
 * added to its own <script> tags, so a script injected through content cannot run. Styles stay open to inline
 * use because themes and blocks set colors and positions with style attributes.
 */
const FRAMES = ['https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://www.aparat.com', 'https://www.openstreetmap.org'];

export function contentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    // Editors may use pictures and videos hosted elsewhere, so any HTTPS address is allowed for media.
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    `frame-src ${FRAMES.join(' ')}`,
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');
}

const withNonce = (html: string, nonce: string) => html.replace(/<script(?![^>]*\snonce=)/g, `<script nonce="${nonce}"`);

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:html', (html, { event }) => {
    const nonce = randomBytes(16).toString('base64');
    for (const part of ['head', 'bodyPrepend', 'body', 'bodyAppend'] as const) html[part] = html[part].map((h) => withNonce(h, nonce));
    setResponseHeaders(event, {
      'Content-Security-Policy': contentSecurityPolicy(nonce),
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      // The editor shows the site inside itself, so framing is allowed for this site only.
      'X-Frame-Options': 'SAMEORIGIN',
    });
  });
});
