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
  business: Partial<BusinessInfo>;
  seo: Partial<SeoSettings>;
  /** The language visitors land on at the root address; '' follows each visitor's browser. */
  defaultLocale: string;
  /** The site's main address, e.g. https://example.com: canonical links and share links use it. */
  origin: string;
  /** Every address of the site, the main one first. */
  domains: string[];
}

/** Site settings, fetched once per request and shared by the layout and pages. */
export function useSiteSettings() {
  const api = useApi();
  return useAsyncData('site-settings', () => api<SiteSettings>('/public/settings'), {
    default: () => null,
  });
}

/** Blocks designed to have the header float over them. */
const FLOAT_HEADER_OVER = ['spotlight', 'type-hero'];

/** Whether the header floats over a page whose first block is `firstType` (always, when the site asks for it). */
export function floatsHeader(firstType: string | undefined, header?: Partial<HeaderSettings>): boolean {
  return Boolean(firstType && (header?.overlay || FLOAT_HEADER_OVER.includes(firstType)));
}

/** Turns a menu or button href into a URL. Bare slugs become locale-prefixed page links. */
export function resolveHref(href: string, locale: string): string {
  if (!href) return '#';
  if (/^(#|\/|https?:|mailto:|tel:)/i.test(href)) return href;
  return `/${locale}/${href}`;
}
