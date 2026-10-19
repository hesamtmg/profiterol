import { randomBytes } from 'node:crypto';

/**
 * Content-Security-Policy for the site and the admin. Scripts must come from this site, or be inline scripts that
 * Nuxt (or a block like the page loader) wrote into this very response: each response gets a fresh nonce that is
 * added to its own <script> tags, so a script injected through content cannot run. Styles stay open to inline
 * use because themes and blocks set colors and positions with style attributes.
 *
 * Pages with the owner's custom HTML tags (Site settings, written by custom-html.ts) open up to any HTTPS address
 * for styles, fonts, frames and requests, as analytics and chat widgets need; when those tags have scripts, the
 * scripts carry the nonce and may load further scripts ('strict-dynamic').
 */
const FRAMES = ['https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://www.aparat.com', 'https://www.openstreetmap.org'];

export function contentSecurityPolicy(nonce: string, custom: { html?: boolean; scripts?: boolean } = {}) {
  const https = custom.html ? ' https:' : '';
  return [
    "default-src 'self'",
    // https: only matters to old browsers that do not know 'strict-dynamic'; newer ones ignore it.
    `script-src 'self' 'nonce-${nonce}'${custom.scripts ? " 'strict-dynamic' https:" : ''}`,
    `style-src 'self' 'unsafe-inline'${https}`,
    `font-src 'self' data:${https}`,
    // Editors may use pictures and videos hosted elsewhere, so any HTTPS address is allowed for media.
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    // 'self': the AI block builder's sandboxed preview (server/routes/admin/block-sandbox.get.ts).
    `frame-src 'self' ${custom.html ? 'https:' : FRAMES.join(' ')}`,
    `connect-src 'self'${https}`,
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
      'Content-Security-Policy': contentSecurityPolicy(nonce, {
        html: Boolean(event.context.customHtmlAdded),
        scripts: event.context.customHtmlAdded?.scripts === true,
      }),
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      // The editor shows the site inside itself, so framing is allowed for this site only.
      'X-Frame-Options': 'SAMEORIGIN',
    });
  });
});
