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
