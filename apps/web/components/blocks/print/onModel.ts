/**
 * "On a model": puts a design on a photo of a person wearing the product. The admin marks where the print sits on
 * the photo with a grid of points (four corners, or more to follow a curved body); each cell of the grid bends its
 * part of the design in perspective. The print is then pushed along the fabric's folds and shaded with the photo's
 * own light, so creases and shadows fall across it as they would on cloth. Everything runs on canvases in the browser.
 */
import type { Mesh } from '@profiterol/blocks';

type Point = [number, number];

export interface ModelPhoto {
  /** The photo, at most MAX_SIDE pixels on its long side. */
  canvas: HTMLCanvasElement;
  /**
   * Where on the design each pixel of `uvBox` falls (u, v from 0 to 1, two numbers per pixel), or NaN outside the
   * print. Worked out once from the grid, so drawing only looks it up.
   */
  uv: Float32Array;
  uvBox: [number, number, number, number];
  /** The part of the photo that is worked on: [x, y, w, h]. */
  box: [number, number, number, number];
  /** Per pixel of `box`, 0..1. Null when the photo's pixels cannot be read (see renderOnModel). */
  mask: Float32Array | null;
  /** The photo's light on the fabric: 1 is plain fabric, less is shadow, more is highlight. */
  shade: Float32Array | null;
  /** How far each pixel's print is pushed along the folds, in pixels. */
  dx: Float32Array | null;
  dy: Float32Array | null;
}

const MAX_SIDE = 1600;

/** Loads an image so its pixels can be read when the server allows it, and still loads it when it does not. */
export function loadPhoto(url: string): Promise<{ img: HTMLImageElement; readable: boolean }> {
  const load = (cors: boolean) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      if (cors) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load ${url}`));
      img.src = url;
    });
  return load(true)
    .then((img) => ({ img, readable: true }))
    .catch(() => load(false).then((img) => ({ img, readable: false })));
}

/** The 3×3 matrix taking the unit square (0,0) (1,0) (1,1) (0,1) to the four corners. */
function squareToQuad([p0, p1, p2, p3]: Point[]): number[] {
  const [x0, y0] = p0;
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [x3, y3] = p3;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) return [x1 - x0, x3 - x0, x0, y1 - y0, y3 - y0, y0, 0, 0, 1];
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

function invert3(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map((v) => v / det);
}

/**
 * Maps each pixel under the grid to its place on the design. Every cell is a four-cornered piece with its own
 * perspective; neighbouring cells share their edges, so the print stays in one piece.
 */
function mapGrid(cols: number, rows: number, pts: Point[], W: number, H: number) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const w = Math.max(1, Math.min(W, Math.ceil(Math.max(...xs))) - x0);
  const h = Math.max(1, Math.min(H, Math.ceil(Math.max(...ys))) - y0);
  const uv = new Float32Array(w * h * 2).fill(NaN);
  const p = (c: number, r: number) => pts[r * cols + c];
  const eps = 1e-3;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const cell = [p(c, r), p(c + 1, r), p(c + 1, r + 1), p(c, r + 1)];
      const inv = invert3(squareToQuad(cell));
      if (!inv.every(Number.isFinite)) continue;
      const cx = cell.map((q) => q[0]);
      const cy = cell.map((q) => q[1]);
      for (let y = Math.max(y0, Math.floor(Math.min(...cy))); y < Math.min(y0 + h, Math.ceil(Math.max(...cy))); y++) {
        for (let x = Math.max(x0, Math.floor(Math.min(...cx))); x < Math.min(x0 + w, Math.ceil(Math.max(...cx))); x++) {
          const sx = x + 0.5;
          const sy = y + 0.5;
          const d = inv[6] * sx + inv[7] * sy + inv[8];
          const u = (inv[0] * sx + inv[1] * sy + inv[2]) / d;
          const v = (inv[3] * sx + inv[4] * sy + inv[5]) / d;
          if (u < -eps || v < -eps || u > 1 + eps || v > 1 + eps) continue;
          const i = ((y - y0) * w + (x - x0)) * 2;
          uv[i] = (c + Math.min(1, Math.max(0, u))) / (cols - 1);
          uv[i + 1] = (r + Math.min(1, Math.max(0, v))) / (rows - 1);
        }
      }
    }
  }
  return { uv, uvBox: [x0, y0, w, h] as [number, number, number, number] };
}

/** The grid's outline, clockwise from the top left. */
function outline(cols: number, rows: number, pts: Point[]): Point[] {
  const p = (c: number, r: number) => pts[r * cols + c];
  return [
    ...Array.from({ length: cols }, (_, c) => p(c, 0)),
    ...Array.from({ length: rows - 1 }, (_, r) => p(cols - 1, r + 1)),
    ...Array.from({ length: cols - 1 }, (_, c) => p(cols - 2 - c, rows - 1)),
    ...Array.from({ length: rows - 2 }, (_, r) => p(0, rows - 2 - r)),
  ];
}

/** Is the point inside the (convex or not) polygon? */
function inside(x: number, y: number, poly: Point[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** A box blur (three passes come close to a Gaussian), in place. */
function blur(a: Float32Array, w: number, h: number, r: number, passes = 2) {
  if (r < 1) return;
  const tmp = new Float32Array(a.length);
  const run = (src: Float32Array, dst: Float32Array, len: number, count: number, step: number, stride: number) => {
    for (let k = 0; k < count; k++) {
      const start = k * stride;
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += src[start + Math.min(len - 1, Math.max(0, i)) * step];
      for (let i = 0; i < len; i++) {
        dst[start + i * step] = sum / (2 * r + 1);
        sum += src[start + Math.min(len - 1, i + r + 1) * step] - src[start + Math.max(0, i - r) * step];
      }
    }
  };
  for (let p = 0; p < passes; p++) {
    run(a, tmp, w, h, 1, w);
    run(tmp, a, h, w, w, 1);
  }
}

/**
 * Reads the photo once: where the print goes, where the fabric is (the mask image, or light, colorless pixels
 * reached from the print), how its light falls, and which way its folds run. `area` is in fractions of the photo.
 */
export function prepareModel(img: HTMLImageElement, readable: boolean, area: Mesh, maskImg?: HTMLImageElement | null): ModelPhoto {
  const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.max(1, Math.round(img.naturalWidth * k));
  const H = Math.max(1, Math.round(img.naturalHeight * k));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const pts = area.points.map(([x, y]) => [x * W, y * H] as Point);
  const { uv, uvBox } = mapGrid(area.cols, area.rows, pts, W, H);
  const corners = outline(area.cols, area.rows, pts);

  const box: [number, number, number, number] = [0, 0, W, H];
  const empty: ModelPhoto = { canvas, uv, uvBox, box, mask: null, shade: null, dx: null, dy: null };
  if (!readable) return empty;

  let px: Uint8ClampedArray;
  try {
    px = ctx.getImageData(...box).data;
  } catch {
    return empty;
  }
  const [, , bw, bh] = box;
  const n = bw * bh;
  const lum = new Float32Array(n);
  const sat = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = px[i * 4] / 255;
    const g = px[i * 4 + 1] / 255;
    const b = px[i * 4 + 2] / 255;
    const max = Math.max(r, g, b);
    lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sat[i] = max > 0 ? (max - Math.min(r, g, b)) / max : 0;
  }

  const mask = new Float32Array(n);
  if (maskImg) {
    const m = document.createElement('canvas');
    m.width = bw;
    m.height = bh;
    const mctx = m.getContext('2d', { willReadFrequently: true })!;
    mctx.drawImage(maskImg, 0, 0, bw, bh);
    let md: Uint8ClampedArray | null = null;
    try {
      md = mctx.getImageData(0, 0, bw, bh).data;
    } catch {
      md = null;
    }
    for (let i = 0; i < n; i++) mask[i] = md ? ((md[i * 4] + md[i * 4 + 1] + md[i * 4 + 2]) / 765) * (md[i * 4 + 3] / 255) : 1;
  } else {
    // The fabric: light, colorless pixels reached from inside the print, so the whole shirt is found without the
    // skin, hair or a darker background. A light wall touching the shirt would be taken too: that needs a mask.
    const xs = corners.map((p) => p[0]);
    const ys = corners.map((p) => p[1]);
    const fabric: number[] = [];
    const seeds: number[] = [];
    for (let y = Math.max(0, Math.floor(Math.min(...ys))); y < Math.min(bh, Math.ceil(Math.max(...ys))); y++) {
      for (let x = Math.max(0, Math.floor(Math.min(...xs))); x < Math.min(bw, Math.ceil(Math.max(...xs))); x++) {
        const i = y * bw + x;
        if (!inside(x + 0.5, y + 0.5, corners)) continue;
        seeds.push(i);
        if (sat[i] < 0.25) fabric.push(lum[i]);
      }
    }
    fabric.sort((a, b) => a - b);
    const ref = fabric.length ? fabric[Math.floor(fabric.length * 0.6)] : 1;
    const like = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const colorless = Math.min(1, Math.max(0, (0.3 - sat[i]) / 0.12));
      const light = Math.min(1, Math.max(0, (lum[i] - ref * 0.3) / (ref * 0.15)));
      like[i] = colorless * light;
    }
    const queue = new Int32Array(n);
    let head = 0;
    let tail = 0;
    for (const i of seeds) {
      if (like[i] > 0.5 && !mask[i]) {
        mask[i] = like[i];
        queue[tail++] = i;
      }
    }
    while (head < tail) {
      const i = queue[head++];
      const x = i % bw;
      for (const j of [x > 0 ? i - 1 : -1, x < bw - 1 ? i + 1 : -1, i - bw, i + bw]) {
        if (j < 0 || j >= n || mask[j]) continue;
        // Edge pixels (part fabric, part something else) are kept softly but not grown from.
        if (like[j] > 0.5) queue[tail++] = j;
        mask[j] = Math.max(1e-3, like[j]);
      }
    }
    blur(mask, bw, bh, 1, 1);
  }

  // The fabric's brightest usual tone counts as unshaded cloth.
  const tones: number[] = [];
  for (let i = 0; i < n; i += 3) if (mask[i] > 0.6) tones.push(lum[i]);
  tones.sort((a, b) => a - b);
  const white = Math.max(0.05, tones.length ? tones[Math.floor(tones.length * 0.9)] : 1);
  const shade = new Float32Array(n);
  for (let i = 0; i < n; i++) shade[i] = Math.min(1.25, lum[i] / white);

  // The folds: the slope of the blurred light pushes the print a little, as a crease bends what is printed on it.
  const soft = lum.slice();
  blur(soft, bw, bh, Math.max(2, Math.round(Math.max(W, H) * 0.008)));
  const dx = new Float32Array(n);
  const dy = new Float32Array(n);
  const strength = Math.max(W, H) * 0.35;
  const limit = Math.max(W, H) * 0.006;
  for (let y = 1; y < bh - 1; y++) {
    for (let x = 1; x < bw - 1; x++) {
      const i = y * bw + x;
      dx[i] = Math.max(-limit, Math.min(limit, ((soft[i + 1] - soft[i - 1]) / 2) * strength));
      dy[i] = Math.max(-limit, Math.min(limit, ((soft[i + bw] - soft[i - bw]) / 2) * strength));
    }
  }
  return { canvas, uv, uvBox, box, mask, shade, dx, dy };
}

const hex = (c: string): [number, number, number] => {
  let h = c.replace('#', '');
  if (h.length === 3) h = [...h].map((ch) => ch + ch).join('');
  const v = parseInt(h.slice(0, 6), 16);
  return Number.isFinite(v) ? [(v >> 16) & 255, (v >> 8) & 255, v & 255] : [255, 255, 255];
};

/**
 * Draws the photo with the design on it into `out` (sized like the prepared photo). `base` is the fabric color the
 * visitor picked. When the photo's pixels could not be read (another site's photo), the design is still bent onto
 * the grid and multiplied over the photo, without folds, shading or a new fabric color.
 */
export function renderOnModel(out: HTMLCanvasElement, model: ModelPhoto, design: HTMLCanvasElement, base: string) {
  const { canvas, uv, uvBox, box, mask, shade, dx, dy } = model;
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0);

  const dw = design.width;
  const dh = design.height;
  const dpx = design.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, dw, dh).data;
  const [x0, y0, bw, bh] = box;
  const [br, bg, bb] = hex(base);
  const [ux0, uy0, uw, uh] = uvBox;

  const target = mask ? ctx.getImageData(x0, y0, bw, bh) : new ImageData(bw, bh);
  const t = target.data;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x;
      const m = mask ? mask[i] : 1;
      if (m <= 0.002) continue;
      // Where on the design this pixel falls, after following the folds. Only the print area takes the design; the
      // rest of the fabric only its color.
      const gx = Math.round(x0 + x + (dx ? dx[i] : 0)) - ux0;
      const gy = Math.round(y0 + y + (dy ? dy[i] : 0)) - uy0;
      const k2 = gx >= 0 && gy >= 0 && gx < uw && gy < uh ? (gy * uw + gx) * 2 : -1;
      const u = k2 < 0 ? NaN : uv[k2] * dw - 0.5;
      const v = k2 < 0 ? NaN : uv[k2 + 1] * dh - 0.5;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      if (u === u && v === v) {
        // Bilinear sample, so the print stays smooth when it is enlarged.
        const ux = Math.floor(u);
        const vy = Math.floor(v);
        const fx = u - ux;
        const fy = v - vy;
        for (const [ox, oy, f] of [
          [0, 0, (1 - fx) * (1 - fy)],
          [1, 0, fx * (1 - fy)],
          [0, 1, (1 - fx) * fy],
          [1, 1, fx * fy],
        ] as const) {
          const qx = ux + ox;
          const qy = vy + oy;
          if (qx < 0 || qy < 0 || qx >= dw || qy >= dh || f === 0) continue;
          const k = (qy * dw + qx) * 4;
          const pa = (dpx[k + 3] / 255) * f;
          r += dpx[k] * pa;
          g += dpx[k + 1] * pa;
          b += dpx[k + 2] * pa;
          a += pa;
        }
      }
      if (!mask) {
        // No pixels to read: only the print, multiplied over the photo below.
        const o = i * 4;
        t[o] = a > 0 ? r / a : 255;
        t[o + 1] = a > 0 ? g / a : 255;
        t[o + 2] = a > 0 ? b / a : 255;
        t[o + 3] = Math.round(a * 255);
        continue;
      }
      // The fabric: its color with the print on top (premultiplied above), then the photo's light.
      const s = shade![i];
      const lit = Math.min(1, s);
      const glow = Math.max(0, s - 1) * 255;
      const fr = (br * (1 - a) + r) * lit + glow;
      const fg = (bg * (1 - a) + g) * lit + glow;
      const fb = (bb * (1 - a) + b) * lit + glow;
      const o = i * 4;
      t[o] = t[o] * (1 - m) + fr * m;
      t[o + 1] = t[o + 1] * (1 - m) + fg * m;
      t[o + 2] = t[o + 2] * (1 - m) + fb * m;
    }
  }
  if (mask) {
    ctx.putImageData(target, x0, y0);
    return;
  }
  const layer = document.createElement('canvas');
  layer.width = bw;
  layer.height = bh;
  layer.getContext('2d')!.putImageData(target, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(layer, x0, y0);
  ctx.globalCompositeOperation = 'source-over';
}
