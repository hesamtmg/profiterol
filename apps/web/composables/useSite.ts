import type { BusinessInfo, HeaderSettings, LoaderSettings, SavedTheme, SeoSettings, SiteFont, ThemeTokens } from '@profiterol/blocks';

export interface MenuItem {
  label: Record<string, string>;
  href: string;
}

export interface SiteSettings {
  siteName: Record<string, string>;
  logo: string;
  favicon: string;
  theme: Partial<ThemeTokens>;
  menu: MenuItem[];
  /** The header's button and placement; its look is `theme.headerStyle`. */
  header?: Partial<HeaderSettings>;
  maintenance: boolean;
  maintenanceText: Record<string, string>;
  fonts: SiteFont[];
  savedThemes: SavedTheme[];
  loader: Partial<LoaderSettings>;
  /** CSS added after the theme on every page (Site settings → Custom CSS). */
  customCss?: string;
  /** HTML tags added to the end of every page's <head> and <body> (Site settings → Custom HTML tags; owners only). */
  headHtml?: string;
  bodyHtml?: string;
  business: Partial<BusinessInfo>;
  seo: Partial<SeoSettings>;
  /** The language visitors land on at the root address; '' follows each visitor's browser. */
  defaultLocale: string;
  /** The site's main address, e.g. https://example.com: canonical links and share links use it. */
  origin: string;
  /** Every address of the site, the main one first. */
  domains: string[];
  /** Set on a preview site (served at <home>/preview/<name>): when it ends, and whether it has. */
  preview?: PreviewInfo | null;
  /** The old preview address of a site that has been bought: where it lives now. */
  movedTo?: string;
}

export interface PreviewInfo {
  expiresAt: string | null;
  expired: boolean;
  /** The address of whoever made the preview (PREVIEW_URL), for "get this site". */
  home: string;
}

/** Days left before a preview ends, counting the last one (0 once it has ended), as Admin → Sites shows it. */
export function previewDaysLeft(preview: PreviewInfo | null | undefined, now = Date.now()): number {
  if (!preview?.expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(preview.expiresAt).getTime() - now) / 86_400_000));
}

/**
 * A preview that has become a real site: its old address sends visitors on to the same page at the new one.
 * `path` is the page's path without the preview's prefix.
 */
export async function followMovedPreview(settings: SiteSettings | null | undefined, path: string) {
  if (settings?.movedTo) await navigateTo(`${settings.movedTo}${path}`, { external: true, redirectCode: 301 });
}

/** Site settings, fetched once per request and shared by the layout and pages. */
export function useSiteSettings() {
  const api = useApi();
  return useAsyncData('site-settings', () => api<SiteSettings>('/public/settings'), {
    default: () => null,
  });
}

/** Blocks designed to have the header float over them. */
const FLOAT_HEADER_OVER = ['spotlight', 'type-hero', 'letter-hero', 'craft-hero'];

/** Whether the header floats over a page whose first block is `firstType` (always, when the site asks for it). */
export function floatsHeader(firstType: string | undefined, header?: Partial<HeaderSettings>): boolean {
  return Boolean(firstType && (header?.overlay || FLOAT_HEADER_OVER.includes(firstType)));
}

/** The path a preview site is served under (/preview/<name>), or '' for a site on its own address. */
export function siteBase(): string {
  try {
    return useRuntimeConfig().public.sitePrefix || '';
  } catch {
    // Outside the app (plain functions called from tests): no prefix.
    return '';
  }
}

/** A root-relative address of this site (/fa/about, /admin) as the browser must ask for it. Uploads are shared. */
export function withSiteBase(path: string): string {
  const base = siteBase();
  if (!base || !path.startsWith('/') || path.startsWith('//') || path.startsWith(`${base}/`) || path === base) return path;
  if (/^\/(uploads|_nuxt)\//.test(path)) return path;
  return `${base}${path}`;
}

/** Turns a menu or button href into a URL. Bare slugs become locale-prefixed page links. */
export function resolveHref(href: string, locale: string): string {
  if (!href) return '#';
  if (href.startsWith('/')) return withSiteBase(href);
  if (/^(#|https?:|mailto:|tel:)/i.test(href)) return href;
  return withSiteBase(`/${locale}/${href}`);
}
