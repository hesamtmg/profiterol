/** Words joined by dashes or slashes; any script is allowed so Persian slugs work (letters, marks, digits, ZWNJ). */
export const SLUG_PATTERN = /^[\p{L}\p{M}\p{N}‌]+(?:[-/][\p{L}\p{M}\p{N}‌]+)*$/u;

/** Like SLUG_PATTERN but a single URL segment (no slashes). */
export const SEGMENT_PATTERN = /^[\p{L}\p{M}\p{N}‌]+(?:-[\p{L}\p{M}\p{N}‌]+)*$/u;

export function slugify(text: string, fallback = 'page'): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}‌]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

/** Postgres unique-violation error code. */
export const UNIQUE_VIOLATION = '23505';
