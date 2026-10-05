import type { LoaderSettings, SavedTheme, SiteFont, ThemeTokens } from '@profiterol/blocks';

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
