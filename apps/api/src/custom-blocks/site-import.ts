import { BadRequestException } from '@nestjs/common';
import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import sanitizeHtml from 'sanitize-html';
import { config } from '../config';

/** The page's HTML is read up to this; larger pages are cut (the top of a page is what matters most). */
const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_CSS_BYTES = 400 * 1024;
const MAX_STYLESHEETS = 4;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;
/** What the AI gets of the page and its styles: enough to see its sections, without filling the model's context. */
export const MAX_DIGEST_CHARS = 60_000;
const MAX_CSS_CHARS = 15_000;

/** Addresses a site may never make the API fetch: the API's own network, the cloud's metadata service, … */
const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
] as const)
  blocked.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const)
  blocked.addSubnet(net, prefix, 'ipv6');

/** True for loopback, private, link-local and other addresses that are not on the public internet. */
export function isPrivateAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (mapped) return isPrivateAddress(mapped);
  const family = isIP(address);
  if (!family) return true;
  return blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

/**
 * Resolves names like the system does, but refuses private addresses. Checked when connecting (not only before), so a
 * name that changes its address between a check and the request cannot reach the API's own network.
 */
const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses: LookupAddress[]) => {
    if (err) return callback(err, '', 0);
    const allowed = config.siteImportAllowPrivate ? addresses : addresses.filter((a) => !isPrivateAddress(a.address));
    if (!allowed.length) {
      return callback(Object.assign(new Error('private address'), { code: 'EPRIVATE' }), '', 0);
    }
    if (options.all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, allowed);
    callback(null, allowed[0].address, allowed[0].family);
  });
};

/** The address as typed (a bare "example.com" is taken as https), or a message saying what is wrong with it. */
export function parseSiteUrl(input: string): URL {
  const text = input.trim();
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  } catch {
    throw new BadRequestException('Enter the address of a website, e.g. https://example.com');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new BadRequestException('Only http and https addresses can be read');
  if (url.username || url.password) throw new BadRequestException('Leave the user name and password out of the address');
  if (url.port && !['80', '443', '8080', '8443'].includes(url.port) && !config.siteImportAllowPrivate) {
    throw new BadRequestException('Only websites on the usual ports can be read');
  }
  url.hash = '';
  return url;
}

interface Fetched {
  url: URL;
  contentType: string;
  body: string;
}

function getOnce(url: URL, maxBytes: number): Promise<{ res: IncomingMessage; body: Buffer }> {
  return new Promise((resolve, reject) => {
    // Node does not call `lookup` for an address written as an IP, so those are checked here.
    const ip = url.hostname.replace(/^\[|\]$/g, '');
    if (isIP(ip) && isPrivateAddress(ip) && !config.siteImportAllowPrivate) {
      reject(Object.assign(new Error('private address'), { code: 'EPRIVATE' }));
      return;
    }
    const req = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
      url,
      {
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; ProfiterolBlockImporter/1.0)',
          accept: 'text/html,application/xhtml+xml,text/css;q=0.9,*/*;q=0.5',
          'accept-language': 'en,fa;q=0.8,*;q=0.5',
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            chunks.push(chunk.subarray(0, chunk.length - (size - maxBytes)));
            res.destroy();
            resolve({ res, body: Buffer.concat(chunks) });
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve({ res, body: Buffer.concat(chunks) }));
        res.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
    req.on('error', reject);
    req.end();
  });
}

/** Follows redirects itself, so each new address passes the same checks. */
async function fetchText(start: URL, maxBytes: number): Promise<Fetched> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let got: Awaited<ReturnType<typeof getOnce>>;
    try {
      got = await getOnce(url, maxBytes);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'EPRIVATE') throw new BadRequestException('This address is on a private network and cannot be read');
      if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') throw new BadRequestException(`No website was found at ${url.host}`);
      if (code === 'ETIMEDOUT') throw new BadRequestException(`${url.host} did not answer in time`);
      throw new BadRequestException(`${url.host} could not be reached (${code ?? 'connection failed'})`);
    }
    const { res, body } = got;
    const status = res.statusCode ?? 0;
    if (status >= 300 && status < 400 && res.headers.location) {
      url = parseSiteUrl(new URL(res.headers.location, url).href);
      continue;
    }
    if (status >= 400) throw new BadRequestException(`${url.host} answered with an error (${status})`);
    return { url, contentType: String(res.headers['content-type'] ?? ''), body: decode(body, String(res.headers['content-type'] ?? '')) };
  }
  throw new BadRequestException('The website redirects too many times');
}

function decode(body: Buffer, contentType: string): string {
  const charset = /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(body.toString('latin1'))?.[1];
  try {
    return new TextDecoder(charset || 'utf-8').decode(body);
  } catch {
    return body.toString('utf8');
  }
}

/** What the AI gets of a website: its address, title, cleaned-up HTML and the gist of its styles. */
export interface SiteDigest {
  url: string;
  title: string;
  html: string;
  css: string;
}

/**
 * Reads a website's page and its first stylesheets for the AI. Only public http(s) addresses are read (see
 * safeLookup), each redirect is checked again, and sizes and time are limited.
 */
export async function readSite(input: string): Promise<SiteDigest> {
  const page = await fetchText(parseSiteUrl(input), MAX_HTML_BYTES);
  if (!/html|xml/i.test(page.contentType) && !/<html|<body|<div/i.test(page.body.slice(0, 4000))) {
    throw new BadRequestException('The address does not lead to a web page');
  }
  const html = page.body;
  // Only for the prompt: tags dropped, the common entities written out.
  const title = sanitizeHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '', { allowedTags: [] })
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .trim()
    .slice(0, 200);

  const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const links = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((m) => m[0])
    .filter((tag) => /rel=["']?[^"'>]*stylesheet/i.test(tag))
    .map((tag) => /href=["']?([^"'\s>]+)/i.exec(tag)?.[1])
    .filter((href): href is string => Boolean(href))
    .slice(0, MAX_STYLESHEETS);
  const sheets = await Promise.all(
    links.map(async (href) => {
      try {
        const sheet = await fetchText(parseSiteUrl(new URL(href.replace(/&amp;/g, '&'), page.url).href), MAX_CSS_BYTES);
        return /css/i.test(sheet.contentType) ? sheet.body : '';
      } catch {
        // A stylesheet that cannot be read only makes the copy less exact.
        return '';
      }
    }),
  );
  return { url: page.url.href, title, html: digestHtml(html, page.url), css: digestCss([...inline, ...sheets].join('\n')) };
}

/**
 * The page's structure and text, without what the AI does not need: scripts, inline SVG paths, comments, tracking
 * attributes and long attribute values. Links and pictures get absolute addresses.
 */
export function digestHtml(html: string, base: URL): string {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  const absolute = (value: string) => {
    try {
      return new URL(value, base).href;
    } catch {
      return value;
    }
  };
  const cleaned = sanitizeHtml(body, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'header',
      'footer',
      'nav',
      'main',
      'section',
      'article',
      'aside',
      'img',
      'picture',
      'video',
      'button',
      'form',
      'input',
      'label',
      'select',
      'option',
      'textarea',
      'svg',
      'figure',
      'figcaption',
    ]),
    disallowedTagsMode: 'discard',
    nonTextTags: ['script', 'style', 'noscript', 'template', 'iframe'],
    allowedAttributes: {
      '*': ['class', 'id', 'role', 'aria-label'],
      a: ['href'],
      img: ['src', 'alt'],
      video: ['src', 'poster'],
      input: ['type', 'placeholder'],
      button: ['type'],
      svg: ['viewBox'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href', 'src', 'poster'],
    transformTags: {
      img: (tagName, attribs) => ({
        tagName,
        // Lazy-loaded pictures keep their real address in data-src.
        attribs: { ...attribs, src: absolute(attribs['data-src'] || attribs.src || '') },
      }),
      a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, ...(attribs.href ? { href: absolute(attribs.href) } : {}) } }),
    },
    // Utility-class sites (Tailwind) can have hundreds of classes on one element.
    textFilter: (text) => text.replace(/\s+/g, ' '),
  })
    .replace(/ class="([^"]{200})[^"]+"/g, ' class="$1…"')
    .replace(/<svg[^>]*>\s*<\/svg>/g, '<svg/>')
    .replace(/>\s+</g, '><')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return cleaned.length > MAX_DIGEST_CHARS ? `${cleaned.slice(0, MAX_DIGEST_CHARS)}\n<!-- … the rest of the page is cut off -->` : cleaned;
}

/**
 * The gist of a site's CSS: custom properties (often its whole palette), fonts, colors and the rules of its main
 * elements, minified and limited.
 */
export function digestCss(css: string): string {
  const flat = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};:,])\s*/g, '$1');
  const parts: string[] = [];
  const vars = [...new Set(flat.match(/--[\w-]+:[^;}]{1,80}/g) ?? [])].slice(0, 150);
  if (vars.length) parts.push(`/* custom properties */ ${vars.join(';')}`);
  const fonts = [...new Set(flat.match(/@font-face\{[^}]*\}/g)?.map((f) => /font-family:([^;}]+)/.exec(f)?.[1] ?? '') ?? [])].filter(
    Boolean,
  );
  if (fonts.length) parts.push(`/* web fonts */ ${fonts.join(', ')}`);
  const rules = flat.replace(/@font-face\{[^}]*\}/g, '').replace(/@(?:keyframes|-webkit-keyframes)[^{]*\{(?:[^{}]*\{[^}]*\})*\}/g, '');
  parts.push(`/* rules */ ${rules}`);
  const out = parts.join('\n');
  return out.length > MAX_CSS_CHARS ? `${out.slice(0, MAX_CSS_CHARS)} /* … cut off */` : out;
}
