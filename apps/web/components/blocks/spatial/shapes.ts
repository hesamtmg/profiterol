/**
 * The cut-out shapes of the undplus.com look, drawn in a 100 × 100 box. Most are a closed outline traced around the
 * middle; "sun" is a ring of rays and is drawn with a stroke instead.
 */

/** An outline traced through `points` angles, at the radius `r` gives for each angle (0 is the top). */
function polar(r: (angle: number) => number, points = 240): string {
  let d = '';
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const x = 50 + r(a) * Math.sin(a);
    const y = 50 - r(a) * Math.cos(a);
    d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

/** A star: `tips` points alternating between the outer and inner radius. */
function star(tips: number, outer: number, inner: number, turn = 0): string {
  let d = '';
  for (let i = 0; i < tips * 2; i++) {
    const a = (i / (tips * 2)) * Math.PI * 2 + turn;
    const r = i % 2 ? inner : outer;
    d += `${i ? 'L' : 'M'}${(50 + r * Math.sin(a)).toFixed(2)} ${(50 - r * Math.cos(a)).toFixed(2)}`;
  }
  return `${d}Z`;
}

function rays(count: number): string {
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    d += `M${(50 + 6 * Math.sin(a)).toFixed(2)} ${(50 - 6 * Math.cos(a)).toFixed(2)}L${(50 + 48 * Math.sin(a)).toFixed(2)} ${(50 - 48 * Math.cos(a)).toFixed(2)}`;
  }
  return d;
}

const paths: Record<string, { d: string; stroke?: boolean }> = {
  burst: { d: star(24, 50, 37) },
  sun: { d: rays(18), stroke: true },
  flower: { d: polar((a) => 39 + 11 * Math.cos(5 * a)) },
  octagon: { d: star(4, 50, 50, Math.PI / 8) },
  scallop: { d: polar((a) => 46 + 3.5 * Math.cos(18 * a)) },
  clover: { d: polar((a) => 26 + 24 * Math.abs(Math.cos(2 * a + Math.PI / 4)) ** 0.7) },
  spark: { d: star(4, 50, 13) },
};

/** The drawing for a shape name (a starburst for unknown names). */
export function shapePath(name: string) {
  return paths[name] ?? paths.burst;
}
