import { adminFa } from '~/i18n/admin-fa';

export type AdminLang = 'en' | 'fa';
const STORE = 'profiterol-admin-lang';

/** The admin's language, shared by every admin screen. Remembered in this browser. */
const lang = ref<AdminLang>('en');
let loaded = false;

function load() {
  if (loaded || !import.meta.client) return;
  loaded = true;
  try {
    const saved = localStorage.getItem(STORE);
    if (saved === 'fa' || saved === 'en') lang.value = saved;
    else if (navigator.language.startsWith('fa')) lang.value = 'fa';
  } catch {
    /* private mode: stay in English */
  }
}

/**
 * Translates an admin string. Strings are written in English in the code and looked up in the Persian
 * dictionary; anything missing stays English, so a forgotten string is never blank. `{name}` placeholders
 * are filled from `vars`.
 */
export function translate(text: string, vars?: Record<string, string | number>): string {
  load();
  let out = lang.value === 'fa' ? (adminFa[text] ?? text) : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}

/** The locale for numbers and dates in the admin (Persian digits and calendar in Persian). */
export function adminLocale(): string | undefined {
  load();
  return lang.value === 'fa' ? 'fa-IR' : undefined;
}

export function useAdminI18n() {
  load();
  const dir = computed(() => (lang.value === 'fa' ? 'rtl' : 'ltr'));
  function setLang(next: AdminLang) {
    lang.value = next;
    try {
      localStorage.setItem(STORE, next);
    } catch {
      /* not remembered, still switched */
    }
  }
  /** Numbers and dates in the admin's language. */
  const numberLocale = computed(() => (lang.value === 'fa' ? 'fa-IR' : 'en-GB'));
  return { lang, dir, setLang, t: translate, numberLocale };
}
