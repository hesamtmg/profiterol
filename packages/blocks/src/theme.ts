export interface ThemeTokens {
  primary: string;
  secondary: string;
  dark: string;
  surface: string;
  background: string;
  text: string;
  muted: string;
  radius: string;
  fontFa: string;
  fontEn: string;
}

/** Default theme, taken from the amsr-portfolio card look. */
export const defaultTheme: ThemeTokens = {
  primary: '#00a998',
  secondary: '#c49a6c',
  dark: '#231f20',
  surface: '#ffffff',
  background: '#00a998',
  text: '#22292f',
  muted: '#6b7280',
  radius: '4rem',
  fontFa: 'Vazirmatn',
  fontEn: 'Inter',
};

/** Keeps a token from breaking out of its declaration (`;`, braces, quotes, tags). */
function clean(value: unknown): string {
  return String(value ?? '').replace(/[;{}<>"'\\]/g, '');
}

/** Turns theme tokens into CSS custom properties. */
export function themeToCss(theme: Partial<ThemeTokens>): string {
  const merged = { ...defaultTheme, ...theme };
  const t = Object.fromEntries(
    Object.entries(merged).map(([k, v]) => [k, clean(v)]),
  ) as unknown as ThemeTokens;
  return [
    `--c-primary:${t.primary}`,
    `--c-secondary:${t.secondary}`,
    `--c-dark:${t.dark}`,
    `--c-surface:${t.surface}`,
    `--c-background:${t.background}`,
    `--c-text:${t.text}`,
    `--c-muted:${t.muted}`,
    `--radius-card:${t.radius}`,
    `--font-fa:'${t.fontFa}'`,
    `--font-en:'${t.fontEn}'`,
  ].join(';');
}
