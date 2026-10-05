export interface ThemeTokens {
  primary: string;
  secondary: string;
  dark: string;
  surface: string;
  background: string;
  text: string;
  muted: string;
  /** Corner radius of the big panels. */
  radius: string;
  /** Corner radius of buttons. */
  buttonRadius: string;
  fontFa: string;
  fontEn: string;
  /** Header bar: solid white, or frosted glass with white text. */
  headerStyle: 'solid' | 'glass';
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
  buttonRadius: '9999px',
  fontFa: 'Vazirmatn',
  fontEn: 'Inter',
  headerStyle: 'solid',
};

export interface ThemePreset {
  key: string;
  name: string;
  theme: ThemeTokens;
}

/** Ready-made themes to start from. */
export const themePresets: ThemePreset[] = [
  { key: 'amsr-teal', name: 'AMSR Teal', theme: defaultTheme },
  {
    key: 'amsr-night',
    name: 'AMSR Night',
    theme: {
      ...defaultTheme,
      background: '#0d0d0f',
      dark: '#1b1b1e',
      headerStyle: 'glass',
    },
  },
  {
    key: 'sand',
    name: 'Sand',
    theme: {
      ...defaultTheme,
      primary: '#231f20',
      secondary: '#00a998',
      background: '#c49a6c',
      surface: '#fffaf3',
      dark: '#231f20',
      text: '#2b2118',
      muted: '#7a6a58',
      radius: '2.5rem',
    },
  },
  {
    key: 'minimal',
    name: 'Minimal',
    theme: {
      ...defaultTheme,
      primary: '#111827',
      secondary: '#6b7280',
      background: '#f1f2f4',
      surface: '#ffffff',
      dark: '#111827',
      text: '#111827',
      muted: '#6b7280',
      radius: '1.5rem',
      buttonRadius: '0.75rem',
      fontEn: 'Manrope',
    },
  },
  {
    key: 'ocean',
    name: 'Ocean',
    theme: {
      ...defaultTheme,
      primary: '#1c9ad6',
      secondary: '#ffb547',
      background: '#0f3d5e',
      surface: '#ffffff',
      dark: '#0b2537',
      text: '#10243a',
      muted: '#5b6b7c',
      radius: '3rem',
      headerStyle: 'glass',
      fontEn: 'Montserrat',
    },
  },
  {
    key: 'rose',
    name: 'Rose',
    theme: {
      ...defaultTheme,
      primary: '#c2416b',
      secondary: '#3d2c5e',
      background: '#f3d9d9',
      surface: '#fffafa',
      dark: '#3d2c5e',
      text: '#2d1f2a',
      muted: '#7d6670',
      radius: '2rem',
      fontEn: 'Playfair Display',
    },
  },
];

/** Google Fonts that can be chosen, with the weights each one offers. */
export const themeFonts = {
  fa: [
    { name: 'Vazirmatn', weights: 'wght@100..900' },
    { name: 'Noto Sans Arabic', weights: 'wght@100..900' },
    { name: 'Noto Naskh Arabic', weights: 'wght@400..700' },
    { name: 'Cairo', weights: 'wght@200..1000' },
    { name: 'Rubik', weights: 'wght@300..900' },
  ],
  en: [
    { name: 'Inter', weights: 'wght@100..900' },
    { name: 'Manrope', weights: 'wght@200..800' },
    { name: 'Montserrat', weights: 'wght@100..900' },
    { name: 'Syne', weights: 'wght@400..800' },
    { name: 'Playfair Display', weights: 'wght@400..900' },
    { name: 'Space Grotesk', weights: 'wght@300..700' },
  ],
};

/** Corner radius choices for panels and buttons. */
export const themeRadii = {
  panel: [
    { value: '0.5rem', label: 'Small' },
    { value: '1.5rem', label: 'Medium' },
    { value: '2rem', label: 'Large' },
    { value: '2.5rem', label: 'Larger' },
    { value: '3rem', label: 'Very large' },
    { value: '4rem', label: 'Extra large (AMSR)' },
  ],
  button: [
    { value: '9999px', label: 'Pill' },
    { value: '0.75rem', label: 'Rounded' },
    { value: '0.25rem', label: 'Square' },
  ],
};

const COLOR_KEYS = ['primary', 'secondary', 'dark', 'surface', 'background', 'text', 'muted'] as const;

/**
 * Keeps only known theme keys with safe values: hex colors, listed radii and fonts, known header styles.
 * Used for both the site theme and page themes before they are stored.
 */
export function cleanTheme(input: unknown): Partial<ThemeTokens> {
  if (typeof input !== 'object' || input === null) return {};
  const src = input as Record<string, unknown>;
  const out: Partial<ThemeTokens> = {};
  for (const key of COLOR_KEYS) {
    const v = src[key];
    if (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v)) out[key] = v;
  }
  if (themeRadii.panel.some((r) => r.value === src.radius)) out.radius = src.radius as string;
  if (themeRadii.button.some((r) => r.value === src.buttonRadius)) out.buttonRadius = src.buttonRadius as string;
  if (themeFonts.fa.some((f) => f.name === src.fontFa)) out.fontFa = src.fontFa as string;
  if (themeFonts.en.some((f) => f.name === src.fontEn)) out.fontEn = src.fontEn as string;
  if (src.headerStyle === 'solid' || src.headerStyle === 'glass') out.headerStyle = src.headerStyle;
  return out;
}

/** The theme a page actually uses: defaults, then the site theme, then the page's own changes. */
export function resolveTheme(site?: Partial<ThemeTokens> | null, page?: Partial<ThemeTokens> | null): ThemeTokens {
  return { ...defaultTheme, ...cleanTheme(site), ...cleanTheme(page) };
}

/** A Google Fonts stylesheet URL for the theme's fonts. */
export function themeFontsHref(theme: Partial<ThemeTokens>): string {
  const t = { ...defaultTheme, ...theme };
  const families = [
    themeFonts.fa.find((f) => f.name === t.fontFa),
    themeFonts.en.find((f) => f.name === t.fontEn),
  ]
    .filter((f): f is { name: string; weights: string } => Boolean(f))
    .map((f) => `family=${f.name.replace(/ /g, '+')}:${f.weights}`);
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

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
    `--radius-button:${t.buttonRadius}`,
    `--font-fa:'${t.fontFa}'`,
    `--font-en:'${t.fontEn}'`,
  ].join(';');
}
