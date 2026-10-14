import type { BusinessInfo, LoaderSettings, SavedTheme, SeoSettings, SiteFont, ThemeTokens } from '@profiterol/blocks';

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
  maintenance: boolean;
  maintenanceText: Record<string, string>;
  fonts: SiteFont[];
  savedThemes: SavedTheme[];
  loader: Partial<LoaderSettings>;
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

/** Turns a menu or button href into a URL. Bare slugs become locale-prefixed page links. */
export function resolveHref(href: string, locale: string): string {
  if (!href) return '#';
  if (/^(#|\/|https?:|mailto:|tel:)/i.test(href)) return href;
  return `/${locale}/${href}`;
}
