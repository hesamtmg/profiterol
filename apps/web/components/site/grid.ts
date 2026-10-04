// Class names are written out in full so Tailwind can find them.
const columns: Record<string, string> = {
  '2': '@2xl:grid-cols-2',
  '3': '@2xl:grid-cols-2 @4xl:grid-cols-3',
  '4': '@2xl:grid-cols-2 @5xl:grid-cols-4',
};

/** Responsive grid classes for a card grid with the given column count. */
export function gridColumns(count: string | number | undefined): string {
  return columns[String(count)] ?? columns['3'];
}
