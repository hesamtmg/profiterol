/**
 * Colors of the mikewilcockdesign.com blocks: the theme's dark color with warm paper-white text, or the theme's
 * surface with its text color. `line` is for the hairlines between rows and around cells.
 */
export function folioColors(look: string) {
  return look === 'light'
    ? { panel: 'bg-surface text-ink', line: 'border-[color-mix(in_srgb,var(--c-text)_14%,transparent)]' }
    : { panel: 'bg-dark text-[#ece9e3]', line: 'border-white/10' };
}

/**
 * The small bracketed labels: monospace, uppercase and spaced out. Right-to-left text keeps the theme font and no
 * extra spacing, which would break the joined letters of Persian words apart.
 */
export const folioLabel = 'font-mono text-[0.7rem] uppercase tracking-[0.14em] @3xl:text-xs rtl:font-[inherit] rtl:tracking-normal';
