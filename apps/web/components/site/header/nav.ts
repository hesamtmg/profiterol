import { LOCALE_COOKIE } from '@profiterol/blocks';

/** Everything a header design shows, already resolved for the current language. */
export interface HeaderNav {
  siteName: string;
  logo?: string;
  locale: string;
  links: { label: string; href: string }[];
  /** The header button ("Get in touch"), if the site has one. */
  cta: { label: string; href: string } | null;
  /** The site's other languages, linking to this page in each. */
  languages: { code: string; label: string; href: string }[];
  /** Floating over the first block: light text, no background of its own. */
  light: boolean;
  /** The editor's canvas: nothing fixed to the window, nothing reacting to scrolling. */
  preview: boolean;
  /** From the site's business details, for the full-screen menu. */
  email: string;
  social: { label: string; href: string }[];
}

/**
 * The visitor's own choice wins over the site's first-visit language next time they open the root address. Set in the
 * browser, so cached pages never carry it.
 */
export function rememberLocale(code: string) {
  document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

const NETWORKS: Record<string, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  twitter: 'X',
  x: 'X',
  github: 'GitHub',
  youtube: 'YouTube',
  facebook: 'Facebook',
  t: 'Telegram',
  telegram: 'Telegram',
  dribbble: 'Dribbble',
  behance: 'Behance',
  upwork: 'Upwork',
  aparat: 'Aparat',
};

/** A short name for a profile link: "LinkedIn" for https://www.linkedin.com/company/…, else its host. */
export function networkName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return NETWORKS[host.split('.')[0]] ?? host;
  } catch {
    return url;
  }
}

/** The window has scrolled past `offset` pixels; false in the editor and during server rendering. */
export function useScrolledPast(offset: number, preview: () => boolean) {
  const past = ref(false);
  useScrollFrame(() => {
    past.value = !preview() && window.scrollY > offset;
  });
  return past;
}
