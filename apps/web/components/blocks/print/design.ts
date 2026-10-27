/**
 * The sublimation designer's drawing code, shared by the live stage, the mock-up preview and the print file. A design
 * is a background plus layers (photos and texts). Positions and sizes are fractions of the print area, so the same
 * design draws at any resolution.
 */
import { surfaceOf, type Surface } from './surfaces';

export type Repeat = 'none' | 'grid' | 'brick' | 'halfdrop' | 'mirror';
export type Mask = 'none' | 'rounded' | 'circle' | 'heart' | 'star';

interface LayerBase {
  id: string;
  /** Center, as a fraction of the area's width and height. */
  x: number;
  y: number;
  /** Photos: width as a fraction of the area's width. Texts: font size as a fraction of the area's width. */
  w: number;
  /** Degrees, clockwise. */
  rot: number;
  flipX: boolean;
  flipY: boolean;
  opacity: number;
  /** Repeats the layer across the whole area, like a fabric pattern. */
  repeat: Repeat;
  /** Space between repeats, as a fraction of the layer's size. */
  gap: number;
  shadow: boolean;
}

export interface ImageLayer extends LayerBase {
  kind: 'image';
  imageId: string;
  name: string;
  nw: number;
  nh: number;
  filter: string;
  mask: Mask;
}

export interface TextLayer extends LayerBase {
  kind: 'text';
  text: string;
  font: string;
  color: string;
  stroke: string;
  strokeW: number;
  bold: boolean;
  italic: boolean;
  /** -1 (bends down, ∪) … 1 (arch, ∩); 0 is straight. */
  curve: number;
}

export type Layer = ImageLayer | TextLayer;

export type BackgroundPattern = 'none' | 'stripes' | 'dots' | 'checks' | 'zigzag' | 'waves' | 'gradient';

export interface Background {
  /** Empty: no ink (the fabric's own color shows). */
  color: string;
  pattern: BackgroundPattern;
  color2: string;
  /** Size of the pattern, as a fraction of the area's width. */
  scale: number;
}

export interface Design {
  background: Background;
  layers: Layer[];
}

export const fonts = [
  { label: 'Vazirmatn', css: '"Vazirmatn Variable"' },
  { label: 'Inter', css: '"Inter Variable"' },
  { label: 'Cairo', css: '"Cairo Variable"' },
  { label: 'Noto Naskh', css: '"Noto Naskh Arabic Variable"' },
  { label: 'Rubik', css: '"Rubik Variable"' },
  { label: 'Montserrat', css: '"Montserrat Variable"' },
  { label: 'Playfair', css: '"Playfair Display Variable"' },
  { label: 'Syne', css: '"Syne Variable"' },
  { label: 'Space Grotesk', css: '"Space Grotesk Variable"' },
  { label: 'Outfit', css: '"Outfit Variable"' },
];

export const filters: Record<string, string> = {
  none: 'none',
  vivid: 'saturate(1.6) contrast(1.1)',
  bw: 'grayscale(1) contrast(1.1)',
  sepia: 'sepia(0.85)',
  warm: 'sepia(0.3) saturate(1.3) hue-rotate(-10deg)',
  cool: 'hue-rotate(15deg) saturate(1.1) brightness(1.05)',
  fade: 'contrast(0.85) brightness(1.1) saturate(0.75)',
  invert: 'invert(1)',
};

export const emptyBackground = (): Background => ({ color: '', pattern: 'none', color2: '#111827', scale: 0.08 });

/** Photos the visitor added, by id. Kept out of the design so undo snapshots stay small. */
export type ImageStore = Map<string, HTMLImageElement>;

let measureCtx: CanvasRenderingContext2D | null = null;

function fontString(l: TextLayer, px: number) {
  return `${l.italic ? 'italic ' : ''}${l.bold ? 800 : 500} ${px}px ${l.font}, system-ui, sans-serif`;
}

const lineHeight = 1.25;

/** The layer's untransformed size in pixels, for an area `aw` pixels wide. */
export function layerSize(l: Layer, aw: number): { w: number; h: number } {
  if (l.kind === 'image') {
    const w = l.w * aw;
    return { w, h: (w * l.nh) / Math.max(1, l.nw) };
  }
  const px = l.w * aw;
  measureCtx ??= document.createElement('canvas').getContext('2d');
  const ctx = measureCtx!;
  ctx.font = fontString(l, px);
  const lines = (l.text || ' ').split('\n');
  const w = Math.max(...lines.map((t) => ctx.measureText(t).width), px * 0.3) + l.strokeW * px * 2;
  let h = lines.length * px * lineHeight;
  const arc = curveAngle(l);
  if (lines.length === 1 && arc) {
    const r = w / Math.abs(arc);
    h += r * (1 - Math.cos(Math.min(Math.PI, Math.abs(arc)) / 2));
  }
  return { w, h };
}

const curveAngle = (l: TextLayer) => (Math.abs(l.curve) < 0.02 ? 0 : l.curve * Math.PI * 1.4);

function maskPath(mask: Mask, w: number, h: number): Path2D | null {
  const p = new Path2D();
  const x = -w / 2;
  const y = -h / 2;
  switch (mask) {
    case 'rounded': {
      const r = Math.min(w, h) * 0.12;
      p.roundRect(x, y, w, h, r);
      return p;
    }
    case 'circle':
      p.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      return p;
    case 'heart': {
      p.moveTo(0, y + h * 0.3);
      p.bezierCurveTo(0, y, x, y, x, y + h * 0.32);
      p.bezierCurveTo(x, y + h * 0.62, 0, y + h * 0.8, 0, y + h);
      p.bezierCurveTo(0, y + h * 0.8, -x, y + h * 0.62, -x, y + h * 0.32);
      p.bezierCurveTo(-x, y, 0, y, 0, y + h * 0.3);
      return p;
    }
    case 'star': {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 0.42 : 1;
        p[i ? 'lineTo' : 'moveTo']((Math.cos(a) * r * w) / 2, (Math.sin(a) * r * h) / 2);
      }
      p.closePath();
      return p;
    }
    default:
      return null;
  }
}

/** Text drawn flat on its own canvas, so curved text can bend it without breaking Persian letter joins. */
function textCanvas(l: TextLayer, px: number): HTMLCanvasElement {
  const lines = (l.text || ' ').split('\n');
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = fontString(l, px);
  const pad = l.strokeW * px + 2;
  const w = Math.max(...lines.map((t) => ctx.measureText(t).width), 1) + pad * 2;
  c.width = Math.ceil(w);
  c.height = Math.ceil(lines.length * px * lineHeight + pad * 2);
  ctx.font = fontString(l, px);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = /[؀-ۿ]/.test(l.text) ? 'rtl' : 'ltr';
  ctx.lineJoin = 'round';
  lines.forEach((t, i) => {
    const y = pad + px * lineHeight * (i + 0.5);
    if (l.strokeW > 0) {
      ctx.strokeStyle = l.stroke;
      ctx.lineWidth = l.strokeW * px * 2;
      ctx.strokeText(t, c.width / 2, y);
    }
    ctx.fillStyle = l.color;
    ctx.fillText(t, c.width / 2, y);
  });
  return c;
}

/** Draws one copy of a layer centered on the origin, already rotated and flipped. */
function drawContent(ctx: CanvasRenderingContext2D, l: Layer, aw: number, images: ImageStore, cache: Map<string, HTMLCanvasElement>) {
  if (l.kind === 'image') {
    const { w, h } = layerSize(l, aw);
    const img = images.get(l.imageId);
    if (!img) return;
    const clip = maskPath(l.mask, w, h);
    ctx.save();
    if (clip) ctx.clip(clip);
    ctx.filter = filters[l.filter] ?? 'none';
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }
  const px = Math.max(2, l.w * aw);
  const key = `${l.id}|${px.toFixed(1)}|${l.text}|${l.font}|${l.color}|${l.stroke}|${l.strokeW}|${l.bold}|${l.italic}`;
  let flat = cache.get(key);
  if (!flat) {
    flat = textCanvas(l, px);
    cache.set(key, flat);
  }
  const arc = curveAngle(l);
  if (!arc || l.text.includes('\n')) {
    ctx.drawImage(flat, -flat.width / 2, -flat.height / 2);
    return;
  }
  // Curved: each thin column of the flat text is placed and turned along a circle.
  const k = Math.sign(arc);
  const angle = Math.min(Math.PI * 1.9, Math.abs(arc));
  const r = flat.width / angle;
  const sag = r * (1 - Math.cos(Math.min(Math.PI, angle) / 2));
  const step = Math.max(1, Math.ceil(flat.width / 900));
  for (let u = 0; u < flat.width; u += step) {
    const theta = -angle / 2 + (u + step / 2) / r;
    ctx.save();
    ctx.translate(r * Math.sin(theta), k * (r - r * Math.cos(theta)) - (k * sag) / 2);
    ctx.rotate(k * theta);
    ctx.drawImage(flat, u, 0, step + 0.6, flat.height, -step / 2, -flat.height / 2, step + 0.6, flat.height);
    ctx.restore();
  }
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  l: Layer,
  aw: number,
  ah: number,
  images: ImageStore,
  cache: Map<string, HTMLCanvasElement>,
) {
  ctx.save();
  ctx.globalAlpha = l.opacity;
  if (l.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = aw * 0.015;
    ctx.shadowOffsetY = aw * 0.006;
  }
  ctx.translate(l.x * aw, l.y * ah);
  ctx.rotate((l.rot * Math.PI) / 180);
  const one = (fx: boolean, fy: boolean) => {
    ctx.save();
    ctx.scale(fx ? -1 : 1, fy ? -1 : 1);
    drawContent(ctx, l, aw, images, cache);
    ctx.restore();
  };
  if (l.repeat === 'none') {
    one(l.flipX, l.flipY);
  } else {
    const { w, h } = layerSize(l, aw);
    const tw = Math.max(w * (1 + l.gap), aw * 0.01);
    const th = Math.max(h * (1 + l.gap), aw * 0.01);
    // Enough copies to cover the area whatever the rotation, never an absurd number.
    const reach = Math.hypot(aw, ah) + Math.max(tw, th);
    const nx = Math.min(80, Math.ceil(reach / tw));
    const ny = Math.min(80, Math.ceil(reach / th));
    for (let j = -ny; j <= ny; j++) {
      for (let i = -nx; i <= nx; i++) {
        let dx = i * tw;
        let dy = j * th;
        if (l.repeat === 'brick' && j % 2) dx += tw / 2;
        if (l.repeat === 'halfdrop' && i % 2) dy += th / 2;
        const mirror = l.repeat === 'mirror';
        ctx.save();
        ctx.translate(dx, dy);
        one(l.flipX !== (mirror && i % 2 !== 0), l.flipY !== (mirror && j % 2 !== 0));
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, bg: Background, aw: number, ah: number) {
  if (bg.color) {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, aw, ah);
  }
  const s = Math.max(4, bg.scale * aw);
  ctx.save();
  ctx.fillStyle = bg.color2;
  ctx.strokeStyle = bg.color2;
  switch (bg.pattern) {
    case 'gradient': {
      const g = ctx.createLinearGradient(0, 0, aw, ah);
      g.addColorStop(0, bg.color || 'rgba(255,255,255,0)');
      g.addColorStop(1, bg.color2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, aw, ah);
      break;
    }
    case 'stripes': {
      ctx.translate(aw / 2, ah / 2);
      ctx.rotate(-Math.PI / 4);
      const r = Math.hypot(aw, ah);
      for (let x = -r; x < r; x += s) ctx.fillRect(x, -r, s / 2, r * 2);
      break;
    }
    case 'dots':
      for (let y = 0, row = 0; y < ah + s; y += s * 0.87, row++) {
        for (let x = row % 2 ? s / 2 : 0; x < aw + s; x += s) {
          ctx.beginPath();
          ctx.arc(x, y, s * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    case 'checks':
      ctx.globalAlpha = 0.5;
      for (let x = 0; x < aw; x += s * 2) ctx.fillRect(x, 0, s, ah);
      for (let y = 0; y < ah; y += s * 2) ctx.fillRect(0, y, aw, s);
      break;
    case 'zigzag':
      ctx.lineWidth = s * 0.18;
      ctx.lineJoin = 'miter';
      for (let y = 0; y < ah + s; y += s * 0.7) {
        ctx.beginPath();
        for (let x = -s, i = 0; x < aw + s; x += s / 2, i++) ctx.lineTo(x, y + (i % 2 ? s * 0.25 : -s * 0.25));
        ctx.stroke();
      }
      break;
    case 'waves':
      ctx.lineWidth = s * 0.16;
      for (let y = 0; y < ah + s; y += s * 0.6) {
        ctx.beginPath();
        for (let x = -s; x <= aw + s; x += 4) ctx.lineTo(x, y + Math.sin((x / s) * Math.PI * 2) * s * 0.18);
        ctx.stroke();
      }
      break;
  }
  ctx.restore();
}

/** Draws the design into a canvas the size of the print area (transparent where there is no ink). */
export function drawDesign(
  ctx: CanvasRenderingContext2D,
  design: Design,
  aw: number,
  ah: number,
  images: ImageStore,
  cache: Map<string, HTMLCanvasElement> = new Map(),
) {
  ctx.clearRect(0, 0, aw, ah);
  drawBackground(ctx, design.background, aw, ah);
  for (const l of design.layers) drawLayer(ctx, l, aw, ah, images, cache);
}

/**
 * Draws the product with the design on it, `scale` pixels per view unit. For mugs, `flat` draws the unrolled print
 * (how it is edited) instead of the cup.
 */
export function drawMockup(
  ctx: CanvasRenderingContext2D,
  surface: Surface,
  base: string,
  design: HTMLCanvasElement,
  scale: number,
  flat = false,
) {
  const [ax, ay, aw, ah] = surface.area;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (surface.mug && flat) {
    const band = new Path2D();
    band.roundRect(ax, ay, aw, ah, 12);
    ctx.fillStyle = base;
    ctx.fill(band);
    ctx.save();
    ctx.clip(band);
    ctx.drawImage(design, ax, ay, aw, ah);
    ctx.restore();
    ctx.strokeStyle = 'rgba(15,23,42,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke(band);
    // Where the handle sits: the two ends of the print meet behind it.
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(ax + aw * 0.25, ay);
    ctx.lineTo(ax + aw * 0.25, ay + ah);
    ctx.moveTo(ax + aw * 0.75, ay);
    ctx.lineTo(ax + aw * 0.75, ay + ah);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const body = new Path2D(surface.body);
  for (const s of surface.straps ?? []) {
    const p = new Path2D(s);
    ctx.lineWidth = 40;
    ctx.strokeStyle = 'rgba(15,23,42,0.28)';
    ctx.stroke(p);
    ctx.lineWidth = 34;
    ctx.strokeStyle = base;
    ctx.stroke(p);
  }
  ctx.fillStyle = base;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  if (surface.mug) {
    // The front half of the wrap, bent around the cup: each thin column comes from its place on the circle.
    const left = 230;
    const right = 720;
    const top = 90;
    const height = 740;
    const r = (right - left) / 2;
    const cx = left + r;
    const cols = 240;
    for (let i = 0; i < cols; i++) {
      const x0 = left + (i / cols) * (right - left);
      const x1 = left + ((i + 1) / cols) * (right - left);
      const t = Math.max(-1, Math.min(1, ((x0 + x1) / 2 - cx) / r));
      const u = 0.5 + Math.asin(t) / (2 * Math.PI);
      const sw = Math.max(1, (design.width * (x1 - x0)) / (Math.PI * r * 2) / Math.sqrt(Math.max(0.05, 1 - t * t)));
      ctx.drawImage(design, u * design.width - sw / 2, 0, sw, design.height, x0, top, x1 - x0 + 0.8, height);
    }
    const g = ctx.createLinearGradient(left, 0, right, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.28)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.18)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = g;
    ctx.fillRect(left, top, right - left, height);
  } else {
    ctx.drawImage(design, ax, ay, aw, ah);
    // Soft light across the fabric, so it reads as cloth rather than a flat sticker.
    ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.6, '#f4f4f5');
    g.addColorStop(1, '#d4d4d8');
    ctx.fillStyle = g;
    ctx.fillRect(ax, ay, aw, ah);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(15,23,42,0.22)';
  ctx.setLineDash([9, 7]);
  for (const s of surface.seams ?? []) ctx.stroke(new Path2D(s));
  ctx.setLineDash([]);
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(15,23,42,0.35)';
  ctx.stroke(body);
  for (const f of surface.fixed ?? []) {
    ctx.fillStyle = f.fill;
    ctx.fill(new Path2D(f.d));
  }
  ctx.restore();
}

/** The four corners of a layer in area pixels, clockwise from the top left. */
export function layerCorners(l: Layer, aw: number, ah: number): [number, number][] {
  const { w, h } = layerSize(l, aw);
  const a = (l.rot * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([x, y]) => [l.x * aw + x * cos - y * sin, l.y * ah + x * sin + y * cos]);
}

/** Whether a point (area pixels) is on the layer's main copy. */
export function hitLayer(l: Layer, px: number, py: number, aw: number, ah: number, slack = 0): boolean {
  const { w, h } = layerSize(l, aw);
  const a = (-l.rot * Math.PI) / 180;
  const dx = px - l.x * aw;
  const dy = py - l.y * ah;
  const lx = dx * Math.cos(a) - dy * Math.sin(a);
  const ly = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= w / 2 + slack && Math.abs(ly) <= h / 2 + slack;
}

/** Print resolution of a photo layer, in dots per inch, at the product's print size. */
export function photoDpi(l: ImageLayer, printWidthCm: number): number {
  const inches = (l.w * printWidthCm) / 2.54;
  return inches > 0 ? Math.round(l.nw / inches) : 0;
}

/** Pixel size of the print file: 150 dpi, kept within what phones can draw (about 16 megapixels). */
export function printPixels(printCm: [number, number]): [number, number] {
  let w = (printCm[0] / 2.54) * 150;
  let h = (printCm[1] / 2.54) * 150;
  const shrink = Math.min(1, 6000 / Math.max(w, h), Math.sqrt(16_000_000 / (w * h)));
  w *= shrink;
  h *= shrink;
  return [Math.round(w), Math.round(h)];
}

export { surfaceOf };
