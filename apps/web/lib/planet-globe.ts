/**
 * Turns a round picture of a planet (a disc on a square, like a render or a photo of a globe) into a texture that
 * wraps all the way round a sphere, so the planet can spin freely in 3D.
 *
 * A picture only shows the half of a planet facing the camera. Here that half is unprojected (orthographic disc →
 * longitude/latitude), the shading baked into the picture is evened out so the scene's own lights can do the shading,
 * and three copies are laid round the globe, each cross-fading into the next over 30°, so there is no seam anywhere.
 * Only the clean middle of the disc is used (up to 75° from its center), where the picture isn't squeezed by the rim.
 */

export interface PlanetSurface {
  /** Equirectangular color map, twice as wide as tall. */
  canvas: HTMLCanvasElement;
  /** The planet's average color, for its atmosphere glow. */
  color: [number, number, number];
}

/** Full size: a 1024 × 512 map read from the picture at 512 px. `light` halves both, for fast loading screens. */
const SIZES = { full: { width: 1024, source: 512 }, light: { width: 512, source: 256 } };
const COPIES = 3;
const KEEP = (75 / 180) * Math.PI;
const FADE = (30 / 180) * Math.PI;

/**
 * `fill` is how much of the picture's width the planet's disc takes up (0–1), centered in the picture.
 */
export function planetSurface(image: CanvasImageSource, fill: number, quality: keyof typeof SIZES = 'full'): PlanetSurface {
  const WIDTH = SIZES[quality].width;
  const HEIGHT = WIDTH / 2;
  const SOURCE = SIZES[quality].source;
  const source = document.createElement('canvas');
  source.width = source.height = SOURCE;
  const sctx = source.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(image, 0, 0, SOURCE, SOURCE);
  const src = sctx.getImageData(0, 0, SOURCE, SOURCE).data;
  // A hair inside the disc, so the rim (and any lines drawn across it in the artwork) stays out.
  const radius = (fill * SOURCE * 0.96) / 2;
  const center = SOURCE / 2;

  /** Bilinear sample at a point of the disc (x right, y up, both −1…1), written into `out`. */
  const out = [0, 0, 0];
  function sample(x: number, y: number) {
    const px = Math.min(SOURCE - 1.001, Math.max(0, center + x * radius - 0.5));
    const py = Math.min(SOURCE - 1.001, Math.max(0, center - y * radius - 0.5));
    const x0 = px | 0;
    const y0 = py | 0;
    const fx = px - x0;
    const fy = py - y0;
    const i00 = (y0 * SOURCE + x0) * 4;
    const i10 = i00 + 4;
    const i01 = i00 + SOURCE * 4;
    const i11 = i01 + 4;
    for (let c = 0; c < 3; c++) {
      const top = src[i00 + c]! * (1 - fx) + src[i10 + c]! * fx;
      const bottom = src[i01 + c]! * (1 - fx) + src[i11 + c]! * fx;
      out[c] = top * (1 - fy) + bottom * fy;
    }
  }

  // How bright the picture is at each distance from the disc's center: the rim of a rendered planet is darker,
  // and that darkening would otherwise end up as dark bands on the globe.
  const BANDS = 32;
  const sums = new Float64Array(BANDS);
  const counts = new Float64Array(BANDS);
  const color = [0, 0, 0];
  let colorCount = 0;
  for (let y = -1; y <= 1; y += 2 / 128) {
    for (let x = -1; x <= 1; x += 2 / 128) {
      const r = Math.hypot(x, y);
      if (r >= 0.98) continue;
      sample(x, y);
      const band = Math.min(BANDS - 1, Math.floor(r * BANDS));
      sums[band] += 0.2126 * out[0]! + 0.7152 * out[1]! + 0.0722 * out[2]!;
      counts[band]++;
      if (r < 0.8) {
        color[0] += out[0]!;
        color[1] += out[1]!;
        color[2] += out[2]!;
        colorCount++;
      }
    }
  }
  let core = 0;
  let coreCount = 0;
  for (let b = 0; b < BANDS * 0.4; b++) {
    core += sums[b]!;
    coreCount += counts[b]!;
  }
  const coreLevel = core / Math.max(coreCount, 1);
  const gain = Array.from({ length: BANDS }, (_, b) => {
    const level = sums[b]! / Math.max(counts[b]!, 1);
    return Math.min(2.2, Math.max(1, coreLevel / Math.max(level, 1)));
  });
  const gainAt = (r: number) => {
    const f = Math.min(BANDS - 1.001, Math.max(0, r * BANDS - 0.5));
    const b = f | 0;
    return gain[b]! * (1 - (f - b)) + gain[b + 1]! * (f - b);
  };

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;
  const target = ctx.createImageData(WIDTH, HEIGHT);
  const data = target.data;
  const step = (Math.PI * 2) / COPIES;
  const rgb = [0, 0, 0];

  for (let j = 0; j < HEIGHT; j++) {
    const lat = Math.PI / 2 - ((j + 0.5) / HEIGHT) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    for (let i = 0; i < WIDTH; i++) {
      const lon = ((i + 0.5) / WIDTH) * Math.PI * 2 - Math.PI;
      rgb[0] = rgb[1] = rgb[2] = 0;
      let total = 0;
      for (let k = 0; k < COPIES; k++) {
        let d = lon - k * step;
        d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
        const w = Math.min(1, Math.max(0, (KEEP - Math.abs(d)) / FADE));
        if (!w) continue;
        const x = cosLat * Math.sin(d);
        sample(x, sinLat);
        const g = gainAt(Math.hypot(x, sinLat));
        rgb[0] += out[0]! * g * w;
        rgb[1] += out[1]! * g * w;
        rgb[2] += out[2]! * g * w;
        total += w;
      }
      const o = (j * WIDTH + i) * 4;
      data[o] = rgb[0]! / total;
      data[o + 1] = rgb[1]! / total;
      data[o + 2] = rgb[2]! / total;
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(target, 0, 0);
  const n = Math.max(colorCount, 1) * 255;
  return { canvas, color: [color[0]! / n, color[1]! / n, color[2]! / n] };
}
