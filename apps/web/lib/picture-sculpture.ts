/**
 * Turns a cut-out picture (an animal on a transparent background) into a solid, rounded 3D object that looks exactly
 * like the picture from the front: the outline is "inflated" like a balloon, so wide parts (a body) swell deep and
 * thin parts (legs, tails, horns) stay slim, and the picture covers it front and back. Its outline comes from the
 * picture's own transparency, so the edges stay as crisp as the artwork.
 *
 * The result stands on y = 0, centered on x = 0, `height` units tall.
 */
import type * as Three from 'three';

export interface Sculpture {
  mesh: Three.Mesh;
  width: number;
  height: number;
}

/** Grid cells across the picture's longer side: enough for smooth outlines and roundness. */
const GRID = 170;

export function sculpt(
  THREE: typeof Three,
  picture: HTMLImageElement | ImageBitmap,
  options: { height: number; flip?: boolean; depth?: number },
): Sculpture {
  const pw = picture.width;
  const ph = picture.height;
  const step = Math.max(pw, ph) / GRID;
  const cols = Math.ceil(pw / step) + 1;
  const rows = Math.ceil(ph / step) + 1;

  // Read the picture's transparency at every grid corner.
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(picture, 0, 0, cols, rows);
  const pixels = ctx.getImageData(0, 0, cols, rows).data;
  const inside = new Uint8Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) inside[i] = pixels[i * 4 + 3]! > 20 ? 1 : 0;

  // How far each inside corner is from the outline (two-pass chamfer distance), then softened.
  const far = 1e6;
  const dist = new Float32Array(cols * rows).map((_, i) => (inside[i] ? far : 0));
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : dist[y * cols + x]!);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (!inside[i]) continue;
      dist[i] = Math.min(dist[i]!, at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
    }
  for (let y = rows - 1; y >= 0; y--)
    for (let x = cols - 1; x >= 0; x--) {
      const i = y * cols + x;
      if (!inside[i]) continue;
      dist[i] = Math.min(dist[i]!, at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
    }
  for (let pass = 0; pass < 2; pass++) {
    const copy = dist.slice();
    for (let y = 1; y < rows - 1; y++)
      for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x;
        if (!inside[i]) continue;
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const j = i + dy * cols + dx;
            if (inside[j]) {
              sum += copy[j]!;
              n++;
            }
          }
        dist[i] = sum / n;
      }
  }

  // Size in the world, and how deep the body swells: a round cross-section, like a balloon.
  const scale = options.height / ph;
  const width = pw * scale;
  const cell = step * scale;
  const depth = options.depth ?? 1;
  const swell = (d: number) => Math.sqrt(Math.max(d, 0.35)) * cell * 1.6 * depth;
  const flip = options.flip ? -1 : 1;

  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const front = new Int32Array(cols * rows).fill(-1);
  const back = new Int32Array(cols * rows).fill(-1);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (!inside[i]) continue;
      const u = Math.min(1, (x * step) / pw);
      const v = Math.min(1, (y * step) / ph);
      const wx = (u - 0.5) * width * flip;
      const wy = (1 - v) * options.height;
      const h = swell(dist[i]!);
      front[i] = positions.length / 3;
      positions.push(wx, wy, h);
      uvs.push(u, 1 - v);
      back[i] = positions.length / 3;
      positions.push(wx, wy, -h);
      uvs.push(u, 1 - v);
    }
  // Faces where all four corners are inside; the outline gets a narrow wall joining front and back.
  const quad = (a: number, b: number, c: number, d: number) => index.push(a, b, c, a, c, d);
  const filled = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < cols - 1 &&
    y < rows - 1 &&
    inside[y * cols + x]! &&
    inside[y * cols + x + 1]! &&
    inside[(y + 1) * cols + x]! &&
    inside[(y + 1) * cols + x + 1]!;
  for (let y = 0; y < rows - 1; y++)
    for (let x = 0; x < cols - 1; x++) {
      if (!filled(x, y)) continue;
      const tl = y * cols + x;
      const tr = tl + 1;
      const bl = tl + cols;
      const br = bl + 1;
      if (flip > 0) {
        quad(front[bl]!, front[br]!, front[tr]!, front[tl]!);
        quad(back[tl]!, back[tr]!, back[br]!, back[bl]!);
      } else {
        quad(front[tl]!, front[tr]!, front[br]!, front[bl]!);
        quad(back[bl]!, back[br]!, back[tr]!, back[tl]!);
      }
      const wall = (a: number, b: number) =>
        flip > 0 ? quad(front[a]!, front[b]!, back[b]!, back[a]!) : quad(front[b]!, front[a]!, back[a]!, back[b]!);
      if (!filled(x, y - 1)) wall(tl, tr);
      if (!filled(x + 1, y)) wall(tr, br);
      if (!filled(x, y + 1)) wall(br, bl);
      if (!filled(x - 1, y)) wall(bl, tl);
    }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const texture = new THREE.Texture(picture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    alphaTest: 0.5,
    roughness: 0.55,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.dispose = () => {
    geometry.dispose();
    material.dispose();
    texture.dispose();
  };
  return { mesh, width, height: options.height };
}
