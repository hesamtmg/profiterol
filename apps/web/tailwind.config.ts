import containerQueries from '@tailwindcss/container-queries';
import type { Config } from 'tailwindcss';

/**
 * Site blocks use container queries (`@3xl:`) instead of viewport breakpoints (`md:`),
 * so the editor's tablet and mobile previews reflow exactly like real devices.
 * Colors and the card radius come from theme tokens set as CSS variables.
 */
export default <Partial<Config>>{
  content: [
    './components/**/*.{vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--c-primary)',
        secondary: 'var(--c-secondary)',
        dark: 'var(--c-dark)',
        surface: 'var(--c-surface)',
        ink: 'var(--c-text)',
        muted: 'var(--c-muted)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
      },
      transitionDuration: {
        1000: '1000ms',
      },
    },
  },
  plugins: [containerQueries],
};
