import { cleanTheme, type ThemeTokens } from './theme.js';
import { isSafeUrl } from './validate.js';

/** A font uploaded by the site owner, with one file per weight/style. */
export interface SiteFont {
  name: string;
  files: { url: string; weight: number; style: 'normal' | 'italic' }[];
}

/** A theme the site owner saved under their own name. */
export interface SavedTheme {
  key: string;
  name: string;
  theme: Partial<ThemeTokens>;
}

/** How the loading screen looks. */
export const loaderStyles = ['percent', 'bar', 'name', 'logo', 'spinner', 'dots', 'curtain', 'typing', 'pulse'] as const;
export type LoaderStyle = (typeof loaderStyles)[number];

/** How big the loader's name, counter and logo are drawn. */
export const loaderSizes = ['small', 'medium', 'large'] as const;
export type LoaderSize = (typeof loaderSizes)[number];

/** The screen shown while the site loads (minicms's page loader). */
export interface LoaderSettings {
  enabled: boolean;
  style: LoaderStyle;
  /** Small line under the counter, per locale. */
  text: Record<string, string>;
  /** Optional background picture, blurred and sharpening as it loads. */
  background: string;
  /** Picture used instead of `background` on phones (narrow screens); `background` when empty. */
  backgroundMobile: string;
  /** Show it only on the first page of a visit. */
  oncePerSession: boolean;
  /** Color of the name, counter and line; white when empty. */
  textColor: string;
  /** Color of the bar, ring, dots and fill; the theme's main color when empty. */
  accentColor: string;
  /** Color of the cover behind everything; the theme's dark color when empty. */
  backgroundColor: string;
  /** How dark the shade over the background picture is, 0–80 (%). */
  overlay: number;
  /** Blur the background picture and sharpen it as the page loads. */
  blur: boolean;
  size: LoaderSize;
  /** A picture used instead of the site logo (logo and pulse styles); the site logo when empty. */
  logo: string;
  /** The loader stays at least this long, in seconds (0.5–6). */
  minSeconds: number;
  /** Do not show it on phones (narrow screens). */
  hideOnMobile: boolean;
}

export const defaultLoader: LoaderSettings = {
  enabled: false,
  style: 'percent',
  text: {},
  background: '',
  backgroundMobile: '',
  oncePerSession: true,
  textColor: '',
  accentColor: '',
  backgroundColor: '',
  overlay: 50,
  blur: true,
  size: 'medium',
  logo: '',
  minSeconds: 1.2,
  hideOnMobile: false,
};

/** Font names end up in CSS, so only letters (any script), digits, spaces, dashes and underscores. */
const FONT_NAME = /^[\p{L}\p{N} _-]{1,40}$/u;
/** Only fonts uploaded to this site's own media library. */
const FONT_URL = /^\/uploads\/[\w-]+\.(woff2|woff|ttf|otf)$/;
const FORMATS: Record<string, string> = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };
const MAX_FONTS = 20;

export function isFontName(name: unknown): name is string {
  return typeof name === 'string' && FONT_NAME.test(name.trim()) && name.trim() === name;
}

/** Keeps only well-formed uploaded fonts; drops anything else. */
export function cleanFonts(input: unknown): SiteFont[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: SiteFont[] = [];
  for (const f of input.slice(0, MAX_FONTS)) {
    if (typeof f !== 'object' || f === null) continue;
    const { name, files } = f as Record<string, unknown>;
    if (!isFontName(name) || seen.has(name.toLowerCase()) || !Array.isArray(files)) continue;
    const clean = files
      .slice(0, 12)
      .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
      .filter((x) => typeof x.url === 'string' && FONT_URL.test(x.url))
      .map((x) => ({
        url: x.url as string,
        weight: Math.min(900, Math.max(100, Math.round((Number(x.weight) || 400) / 100) * 100)),
        style: (x.style === 'italic' ? 'italic' : 'normal') as 'normal' | 'italic',
      }));
    if (!clean.length) continue;
    seen.add(name.toLowerCase());
    out.push({ name, files: clean });
  }
  return out;
}

/** `@font-face` rules for the uploaded fonts. Inputs are cleaned first, so nothing can break out of the CSS. */
export function fontFaceCss(fonts: unknown): string {
  return cleanFonts(fonts)
    .flatMap((f) =>
      f.files.map((file) => {
        const ext = file.url.split('.').pop() as string;
        return `@font-face{font-family:'${f.name}';src:url('${file.url}') format('${FORMATS[ext]}');font-weight:${file.weight};font-style:${file.style};font-display:swap}`;
      }),
    )
    .join('');
}

export function fontNames(fonts: unknown): string[] {
  return cleanFonts(fonts).map((f) => f.name);
}

export function cleanSavedThemes(input: unknown, customFonts: string[] = []): SavedTheme[] {
  if (!Array.isArray(input)) return [];
  const out: SavedTheme[] = [];
  for (const t of input.slice(0, 30)) {
    if (typeof t !== 'object' || t === null) continue;
    const { key, name, theme } = t as Record<string, unknown>;
    if (typeof key !== 'string' || !/^[a-z0-9-]{1,40}$/.test(key) || out.some((o) => o.key === key)) continue;
    if (typeof name !== 'string' || !name.trim() || name.length > 40) continue;
    out.push({ key, name: name.trim(), theme: cleanTheme(theme, customFonts) });
  }
  return out;
}

const LOADER_PICTURE = /^\/uploads\/[\w-]+\.(jpg|png|webp|avif|gif)$/;
/** Colors end up in style attributes, so only #rgb, #rgba, #rrggbb and #rrggbbaa. */
const LOADER_COLOR = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function pick(v: unknown, pattern: RegExp): string {
  return typeof v === 'string' && pattern.test(v) ? v : '';
}

function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function cleanLoader(input: unknown): LoaderSettings {
  const src = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const text: Record<string, string> = {};
  if (typeof src.text === 'object' && src.text !== null) {
    for (const [k, v] of Object.entries(src.text)) if (/^[a-z]{2}$/.test(k) && typeof v === 'string') text[k] = v.slice(0, 120);
  }
  return {
    enabled: src.enabled === true,
    style: loaderStyles.includes(src.style as LoaderStyle) ? (src.style as LoaderStyle) : 'percent',
    text,
    background: pick(src.background, LOADER_PICTURE),
    backgroundMobile: pick(src.backgroundMobile, LOADER_PICTURE),
    oncePerSession: src.oncePerSession !== false,
    textColor: pick(src.textColor, LOADER_COLOR),
    accentColor: pick(src.accentColor, LOADER_COLOR),
    backgroundColor: pick(src.backgroundColor, LOADER_COLOR),
    overlay: Math.round(clampNumber(src.overlay, 0, 80, defaultLoader.overlay)),
    blur: src.blur !== false,
    size: loaderSizes.includes(src.size as LoaderSize) ? (src.size as LoaderSize) : 'medium',
    logo: pick(src.logo, LOADER_PICTURE),
    minSeconds: Math.round(clampNumber(src.minSeconds, 0.5, 6, defaultLoader.minSeconds) * 10) / 10,
    hideOnMobile: src.hideOnMobile === true,
  };
}

/** The header's extras; its look is the theme's `headerStyle`. */
export interface HeaderSettings {
  /** A button beside the menu ("Get in touch"), per locale; none when empty. */
  ctaLabel: Record<string, string>;
  ctaLink: string;
  /** Float over the first block with light text, on every page (always on above the spotlight and big type heroes). */
  overlay: boolean;
  /** Shown in the middle of the "Bar with the local time" header, per locale ("Manchester, UK"). */
  place: Record<string, string>;
  /** IANA time zone of the clock beside `place` (Europe/London); no clock when empty or unknown. */
  timeZone: string;
}

export const defaultHeader: HeaderSettings = { ctaLabel: {}, ctaLink: '', overlay: false, place: {}, timeZone: '' };

function perLocale(input: unknown, max: number): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof input === 'object' && input !== null) {
    for (const [k, v] of Object.entries(input)) if (/^[a-z]{2}$/.test(k) && typeof v === 'string') out[k] = v.trim().slice(0, max);
  }
  return out;
}

export function cleanHeader(input: unknown): HeaderSettings {
  const src = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const link = typeof src.ctaLink === 'string' ? src.ctaLink.trim().slice(0, 500) : '';
  const zone = typeof src.timeZone === 'string' ? src.timeZone.trim() : '';
  return {
    ctaLabel: perLocale(src.ctaLabel, 40),
    ctaLink: isSafeUrl(link) ? link : '',
    overlay: src.overlay === true,
    place: perLocale(src.place, 60),
    // Only the shape of a zone name (Europe/London, Etc/GMT+3, UTC); the browser decides whether it knows it.
    timeZone: /^[A-Za-z][\w+-]*(\/[\w+-]+){0,2}$/.test(zone) && zone.length <= 40 ? zone : '',
  };
}

/** The most custom CSS kept for the site or one page. */
export const MAX_CUSTOM_CSS = 50_000;

/**
 * Custom CSS written by the site's editors (Site settings, and each page's settings). It goes into a <style> tag,
 * so `<` is written as the CSS escape `\3c ` and nothing can close the tag and add HTML. CSS itself has no other
 * use for `<` outside strings, and inside strings the escape means the same character.
 */
export function cleanCss(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.slice(0, MAX_CUSTOM_CSS).replace(/</g, '\\3c ').trim();
}

/** The most custom HTML kept for the site's <head> or the end of its <body>. */
export const MAX_CUSTOM_HTML = 20_000;

/**
 * HTML tags the site's owner adds to every page (Site settings → Custom HTML tags): analytics and chat snippets,
 * verification <meta> tags, extra <link>s. It is written into the page as it is, so only owners may set it.
 */
export function cleanCustomHtml(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.slice(0, MAX_CUSTOM_HTML).trim();
}

/** Whether custom HTML has a <script>, so the page's Content-Security-Policy has to let it load more scripts. */
export function customHtmlHasScript(html: unknown): boolean {
  return typeof html === 'string' && /<script\b/i.test(html);
}

/** Widths of the WebP copies made for every uploaded photo (never larger than the original). */
export const imageWidths = [480, 960, 1600, 2400] as const;

const RESIZABLE = /^\/uploads\/([\w-]+)\.(jpe?g|png|webp|avif)$/i;

/**
 * The `srcset` for an uploaded photo, so browsers download a size that fits the screen instead of the
 * original. Empty for anything else (GIFs, videos, outside links).
 */
export function imageSrcset(url: unknown): string {
  const m = typeof url === 'string' ? RESIZABLE.exec(url) : null;
  return m ? imageWidths.map((w) => `/uploads/${m[1]}-${w}.webp ${w}w`).join(', ') : '';
}

/** One size of an uploaded photo (e.g. for a CSS background), or the URL itself for anything else. */
export function imageVariant(url: unknown, width: (typeof imageWidths)[number]): string {
  const m = typeof url === 'string' ? RESIZABLE.exec(url) : null;
  return m ? `/uploads/${m[1]}-${width}.webp` : typeof url === 'string' ? url : '';
}
