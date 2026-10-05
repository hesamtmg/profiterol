import { cleanTheme, type ThemeTokens } from './theme.js';

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

/** The screen shown while the site loads (minicms's page loader). */
export interface LoaderSettings {
  enabled: boolean;
  style: 'percent' | 'name' | 'bar';
  /** Small line under the counter, per locale. */
  text: Record<string, string>;
  /** Optional background picture, blurred and sharpening as it loads. */
  background: string;
  /** Show it only on the first page of a visit. */
  oncePerSession: boolean;
}

export const defaultLoader: LoaderSettings = { enabled: false, style: 'percent', text: {}, background: '', oncePerSession: true };

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

export function cleanLoader(input: unknown): LoaderSettings {
  const src = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const text: Record<string, string> = {};
  if (typeof src.text === 'object' && src.text !== null) {
    for (const [k, v] of Object.entries(src.text)) if (/^[a-z]{2}$/.test(k) && typeof v === 'string') text[k] = v.slice(0, 120);
  }
  const bg =
    typeof src.background === 'string' && /^\/uploads\/[\w-]+\.(jpg|png|webp|avif|gif)$/.test(src.background) ? src.background : '';
  return {
    enabled: src.enabled === true,
    style: src.style === 'name' || src.style === 'bar' ? src.style : 'percent',
    text,
    background: bg,
    oncePerSession: src.oncePerSession !== false,
  };
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
