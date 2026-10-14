export interface LocaleDef {
  code: string;
  label: string;
  dir: 'rtl' | 'ltr';
}

/** Supported content locales. Add an entry here to add a language. */
export const locales: LocaleDef[] = [
  { code: 'fa', label: 'فارسی', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
];

export const defaultLocale = 'fa';

export function getLocale(code: string): LocaleDef | undefined {
  return locales.find((l) => l.code === code);
}

export function isLocale(code: string): boolean {
  return locales.some((l) => l.code === code);
}

/** Remembers the language a visitor picked on the site, so the root address opens in it next time. */
export const LOCALE_COOKIE = 'pt_lang';

/** A site's default language: the one set in its settings (Admin → Settings), else the built-in default. */
export function siteDefaultLocale(chosen?: string | null): string {
  return chosen && isLocale(chosen) ? chosen : defaultLocale;
}
