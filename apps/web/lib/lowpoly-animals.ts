/**
 * Low-poly 3D animals, modelled in code in the style of Kasra Haghdoust's NFT series: each animal is built from a few
 * rough shapes (faceted balls, tapered limbs, cones), its corners nudged a little so no two facets line up, and every
 * triangle shaded slightly lighter or darker than its neighbours, so it reads as folded paper. Flat shading does
 * the rest. All animals face +x and stand on y = 0, about 1–2 units long.
 *
 * Each animal is a small rig: its parts hang from named joints (head, tail, four legs, wings), so the scene can make
 * it breathe, look round, swish its tail, walk or flap.
 */
import type * as Three from 'three';

export const animalKinds = ['owl', 'tiger', 'bear', 'wolf', 'bull', 'unicorn', 'mammoth', 'rhino'] as const;
export type AnimalKind = (typeof animalKinds)[number];

type V3 = [number, number, number];

export interface Animal {
  kind: AnimalKind;
  root: Three.Group;
  /** Length along x and height, for laying animals out side by side. */
  length: number;
  height: number;
  flies: boolean;
  /** Moves the rig: `time` in seconds, `walk` 0 (standing) to 1 (walking), `phase` offsets it from the others. */
  pose(time: number, walk: number, phase: number): void;
}

const hash = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function animalBuilder(THREE: typeof Three, materials: { solid: Three.Material; thin: Three.Material }) {
  const up = new THREE.Vector3(0, 1, 0);

  /** Nudge corners (the same corner always the same way, so shapes stay closed) and shade each triangle. */
  function facet(geometry: Three.BufferGeometry, color: number, { shade = 0.1, jitter = 0.035, seed = 1 } = {}) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    g.deleteAttribute('uv');
    const pos = g.attributes.position as Three.BufferAttribute;
    if (jitter) {
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const key = Math.round(x * 997) * 7.1 + Math.round(y * 991) * 3.3 + Math.round(z * 983) * 1.7 + seed;
        pos.setXYZ(i, x + (hash(key) - 0.5) * jitter, y + (hash(key + 1) - 0.5) * jitter, z + (hash(key + 2) - 0.5) * jitter);
      }
    }
    const base = new THREE.Color(color);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let t = 0; t < pos.count / 3; t++) {
      c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + (hash(t * 1.37 + seed * 9.1) - 0.5) * 2 * shade)));
      for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (t * 3 + k) * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }

  /** A faceted ball: radii, center, turn. */
  function blob(r: V3, at: V3, rot: V3 = [0, 0, 0], detail = 1) {
    const g = new THREE.IcosahedronGeometry(1, detail);
    g.scale(...r);
    g.rotateX(rot[0]).rotateY(rot[1]).rotateZ(rot[2]);
    g.translate(...at);
    return g;
  }

  /** A tapered limb from `a` (radius `ra`) to `b` (radius `rb`; 0 for a point). */
  function limb(a: V3, b: V3, ra: number, rb: number, sides = 5) {
    const A = new THREE.Vector3(...a);
    const d = new THREE.Vector3(...b).sub(A);
    const length = d.length();
    const g = new THREE.CylinderGeometry(rb, ra, length, sides, 1);
    g.translate(0, length / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize()));
    g.translate(A.x, A.y, A.z);
    return g;
  }

  /** A bent limb through several points (trunks, tusks, tails), with small balls at the bends. */
  function chain(points: V3[], radii: number[], sides = 5) {
    const parts: Three.BufferGeometry[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      parts.push(limb(points[i]!, points[i + 1]!, radii[i]!, radii[i + 1]!, sides));
      if (i > 0 && radii[i]! > 0.02) parts.push(blob([radii[i]!, radii[i]!, radii[i]!], points[i]!, [0, 0, 0], 0));
    }
    return parts;
  }

  /** A flat, slightly thick fan of triangles from `root` through `edge` points (wings, tail feathers). */
  function fan(root: V3, edge: V3[], thickness = 0.04) {
    const p: number[] = [];
    for (const side of [1, -1]) {
      for (let i = 0; i < edge.length - 1; i++) {
        const a = edge[side > 0 ? i : i + 1]!;
        const b = edge[side > 0 ? i + 1 : i]!;
        p.push(
          root[0],
          root[1] + (side * thickness) / 2,
          root[2],
          a[0],
          a[1] + side * thickness * 0.2,
          a[2],
          b[0],
          b[1] + side * thickness * 0.2,
          b[2],
        );
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return g;
  }

  /** Collects parts per joint, then merges each joint's parts into one mesh. */
  class Rig {
    root = new THREE.Group();
    joints: Record<string, Three.Group> = {};
    body: Three.Mesh | null = null;
    private parts: Record<string, Three.BufferGeometry[]> = {};
    private seed: number;
    constructor(seed: number) {
      this.seed = seed;
    }
    joint(name: string, at: V3, parent = 'body') {
      const j = new THREE.Group();
      j.position.set(...at);
      (parent === 'body' ? this.root : this.joints[parent]!).add(j);
      this.joints[name] = j;
      return this;
    }
    add(joint: string, color: number, ...geometries: (Three.BufferGeometry | Three.BufferGeometry[])[]) {
      const list = (this.parts[joint] ??= []);
      for (const g of geometries.flat()) list.push(facet(g, color, { seed: this.seed + list.length * 13 }));
      return this;
    }
    build() {
      for (const [joint, list] of Object.entries(this.parts)) {
        const mesh = new THREE.Mesh(merge(list), joint.startsWith('wing') || joint === 'tailFan' ? materials.thin : materials.solid);
        (joint === 'body' ? this.root : this.joints[joint]!).add(mesh);
        if (joint === 'body') this.body = mesh;
      }
      return this;
    }
  }

  function merge(list: Three.BufferGeometry[]) {
    let count = 0;
    for (const g of list) count += g.attributes.position!.count;
    const position = new Float32Array(count * 3);
    const normal = new Float32Array(count * 3);
    const color = new Float32Array(count * 3);
    let o = 0;
    for (const g of list) {
      position.set(g.attributes.position!.array as Float32Array, o * 3);
      normal.set(g.attributes.normal!.array as Float32Array, o * 3);
      color.set(g.attributes.color!.array as Float32Array, o * 3);
      o += g.attributes.position!.count;
      g.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(position, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    merged.setAttribute('color', new THREE.BufferAttribute(color, 3));
    merged.computeBoundingSphere();
    return merged;
  }

  interface Body {
    color: number;
    /** Legs and feet, when different. */
    legColor?: number;
    feetColor?: number;
    /** Body length, depth (top to belly) and width. */
    L: number;
    H: number;
    W: number;
    legLength: number;
    legRadius: [number, number];
    /** How much bigger the chest is than the hips. */
    chest?: number;
    /** A hump over the shoulders (bears, mammoths), as a share of the body's depth. */
    hump?: number;
    paws?: boolean;
  }

  /**
   * The parts every four-legged animal shares: chest, belly and hips, four legs on their own joints, and where the
   * neck and tail join. Returns the body's measurements for the head and tail to hang from.
   */
  function quadruped(rig: Rig, b: Body) {
    const top = b.legLength + b.H;
    const mid = b.legLength + b.H / 2;
    const chest = b.chest ?? 1.1;
    rig.add(
      'body',
      b.color,
      blob([b.L * 0.36, (b.H / 2) * chest, (b.W / 2) * chest], [b.L * 0.16, mid + b.H * 0.03, 0]),
      blob([b.L * 0.4, b.H * 0.47, b.W * 0.47], [-b.L * 0.04, mid, 0]),
      blob([b.L * 0.32, b.H * 0.48, b.W * 0.47], [-b.L * 0.2, mid + b.H * 0.02, 0]),
    );
    if (b.hump) rig.add('body', b.color, blob([b.L * 0.34, b.H * b.hump * 0.75, b.W * 0.4], [b.L * 0.1, top - b.H * 0.22, 0]));
    const legColor = b.legColor ?? b.color;
    for (const [name, x, z] of [
      ['legFL', b.L * 0.3, b.W * 0.28],
      ['legFR', b.L * 0.3, -b.W * 0.28],
      ['legBL', -b.L * 0.3, b.W * 0.27],
      ['legBR', -b.L * 0.3, -b.W * 0.27],
    ] as const) {
      const hip = b.legLength + b.H * 0.3;
      const [rt, rb] = b.legRadius;
      const back = x < 0;
      rig.joint(name, [x, hip, z]);
      // Upper and lower leg, the back ones bending backwards at the hock.
      const knee: V3 = [back ? -rt * 0.6 : rt * 0.2, -hip * 0.5, 0];
      rig.add(
        name,
        legColor,
        limb([0, rt * 0.4, 0], knee, rt * (back ? 1.35 : 1.15), (rt + rb) / 2),
        limb(knee, [0, -hip + rb, 0], (rt + rb) / 2, rb),
      );
      if (back) rig.add(name, legColor, blob([rt * 1.2, rt * 1.4, rt * 1.05], [-rt * 0.2, -rt * 0.2, 0]));
      rig.add(
        name,
        b.feetColor ?? legColor,
        b.paws
          ? blob([rb * 1.5, rb * 0.8, rb * 1.3], [rb * 0.5, -hip + rb * 0.7, 0])
          : limb([0, -hip + rb * 1.6, 0], [0, -hip, 0], rb * 1.05, rb * 1.2, 5),
      );
    }
    return {
      neck: [b.L * 0.4, top - b.H * 0.2, 0] as V3,
      tail: [-b.L * 0.5, top - b.H * 0.22, 0] as V3,
      top,
    };
  }

  const builders: Record<AnimalKind, (rig: Rig) => { length: number; height: number }> = {
    tiger(rig) {
      const c = 0xc9c7db;
      const b = quadruped(rig, { color: c, L: 1.9, H: 0.6, W: 0.5, legLength: 0.6, legRadius: [0.11, 0.07], paws: true, chest: 1.12 });
      rig.add('body', c, limb(b.neck, [b.neck[0] + 0.28, b.neck[1] + 0.12, 0], 0.22, 0.17));
      rig.joint('head', [b.neck[0] + 0.32, b.neck[1] + 0.14, 0]);
      rig.add(
        'head',
        c,
        blob([0.23, 0.2, 0.21], [0.1, 0.02, 0]),
        blob([0.14, 0.1, 0.13], [0.3, -0.06, 0]),
        blob([0.1, 0.09, 0.07], [0.12, -0.08, 0.13]),
        blob([0.1, 0.09, 0.07], [0.12, -0.08, -0.13]),
        limb([0.02, 0.15, 0.13], [0.0, 0.26, 0.15], 0.07, 0.02, 4),
        limb([0.02, 0.15, -0.13], [0.0, 0.26, -0.15], 0.07, 0.02, 4),
      );
      rig.add('head', 0x3a3546, blob([0.04, 0.03, 0.04], [0.43, -0.03, 0], [0, 0, 0], 0));
      rig.joint('tail', b.tail);
      rig.add(
        'tail',
        c,
        chain(
          [
            [0, 0, 0],
            [-0.22, -0.2, 0],
            [-0.4, -0.42, 0.02],
            [-0.62, -0.46, 0.04],
            [-0.78, -0.3, 0.05],
            [-0.76, -0.14, 0.05],
          ],
          [0.06, 0.055, 0.05, 0.045, 0.04, 0.02],
        ),
      );
      return { length: 2.6, height: 1.45 };
    },
    bear(rig) {
      const c = 0xcab9a5;
      const b = quadruped(rig, {
        color: c,
        L: 1.85,
        H: 0.95,
        W: 0.85,
        legLength: 0.55,
        legRadius: [0.2, 0.15],
        paws: true,
        hump: 0.42,
        chest: 1.08,
      });
      rig.add('body', c, limb(b.neck, [b.neck[0] + 0.3, b.neck[1] - 0.1, 0], 0.36, 0.27));
      rig.joint('head', [b.neck[0] + 0.34, b.neck[1] - 0.14, 0]);
      rig.add(
        'head',
        c,
        blob([0.28, 0.25, 0.27], [0.08, 0, 0]),
        blob([0.2, 0.13, 0.14], [0.32, -0.1, 0]),
        blob([0.07, 0.07, 0.05], [-0.02, 0.22, 0.17], [0, 0, 0], 0),
        blob([0.07, 0.07, 0.05], [-0.02, 0.22, -0.17], [0, 0, 0], 0),
      );
      rig.add('head', 0x3b302a, blob([0.05, 0.04, 0.05], [0.5, -0.07, 0], [0, 0, 0], 0));
      rig.joint('tail', b.tail);
      rig.add('tail', c, blob([0.09, 0.08, 0.08], [-0.03, 0, 0], [0, 0, 0], 0));
      return { length: 2.3, height: 1.85 };
    },
    wolf(rig) {
      const c = 0xd0d2d7;
      const b = quadruped(rig, { color: c, L: 1.55, H: 0.52, W: 0.42, legLength: 0.74, legRadius: [0.085, 0.05], paws: true, chest: 1.18 });
      rig.add('body', c, limb(b.neck, [b.neck[0] + 0.24, b.neck[1] + 0.22, 0], 0.2, 0.14));
      rig.joint('head', [b.neck[0] + 0.28, b.neck[1] + 0.26, 0]);
      rig.add(
        'head',
        c,
        blob([0.19, 0.17, 0.17], [0.06, 0.02, 0]),
        limb([0.14, -0.03, 0], [0.46, -0.09, 0], 0.11, 0.045),
        limb([0.0, 0.13, 0.09], [-0.03, 0.33, 0.1], 0.07, 0.0, 4),
        limb([0.0, 0.13, -0.09], [-0.03, 0.33, -0.1], 0.07, 0.0, 4),
      );
      rig.add('head', 0x2e2e33, blob([0.04, 0.035, 0.04], [0.47, -0.08, 0], [0, 0, 0], 0));
      rig.joint('tail', b.tail);
      rig.add(
        'tail',
        0xc2c5cb,
        chain(
          [
            [0, 0, 0],
            [-0.2, -0.22, 0],
            [-0.32, -0.5, 0],
            [-0.36, -0.72, 0],
          ],
          [0.07, 0.11, 0.1, 0.02],
          6,
        ),
      );
      return { length: 2.1, height: 1.75 };
    },
    bull(rig) {
      const c = 0x5f5a63;
      const b = quadruped(rig, {
        color: c,
        L: 1.65,
        H: 0.85,
        W: 0.7,
        legLength: 0.5,
        legRadius: [0.13, 0.08],
        chest: 1.28,
        hump: 0.25,
        feetColor: 0x2c292e,
      });
      rig.add('body', c, limb(b.neck, [b.neck[0] + 0.26, b.neck[1] - 0.26, 0], 0.36, 0.25));
      rig.joint('head', [b.neck[0] + 0.3, b.neck[1] - 0.3, 0]);
      rig.add(
        'head',
        c,
        blob([0.22, 0.25, 0.22], [0.04, 0, 0]),
        blob([0.15, 0.13, 0.17], [0.18, -0.2, 0]),
        limb([-0.02, 0.1, 0.17], [-0.1, 0.12, 0.3], 0.06, 0.02, 4),
        limb([-0.02, 0.1, -0.17], [-0.1, 0.12, -0.3], 0.06, 0.02, 4),
      );
      rig.add(
        'head',
        0xe9e2d0,
        chain(
          [
            [0, 0.18, 0.14],
            [0.02, 0.24, 0.36],
            [0.18, 0.38, 0.46],
          ],
          [0.06, 0.042, 0.004],
          5,
        ),
        chain(
          [
            [0, 0.18, -0.14],
            [0.02, 0.24, -0.36],
            [0.18, 0.38, -0.46],
          ],
          [0.06, 0.042, 0.004],
          5,
        ),
      );
      rig.joint('tail', b.tail);
      rig.add(
        'tail',
        c,
        chain(
          [
            [0, 0, 0],
            [-0.08, -0.3, 0],
            [-0.1, -0.6, 0],
          ],
          [0.035, 0.025, 0.02],
          4,
        ),
        blob([0.05, 0.09, 0.05], [-0.1, -0.66, 0], [0, 0, 0], 0),
      );
      return { length: 2.2, height: 1.65 };
    },
    unicorn(rig) {
      const c = 0xe1e4c3;
      const mane = 0xc5cc9f;
      const b = quadruped(rig, {
        color: c,
        L: 1.45,
        H: 0.58,
        W: 0.42,
        legLength: 0.95,
        legRadius: [0.09, 0.05],
        feetColor: 0x8d8f78,
        chest: 1.12,
      });
      const head: V3 = [b.neck[0] + 0.3, b.neck[1] + 0.6, 0];
      rig.add('body', c, limb(b.neck, head, 0.19, 0.12, 6));
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const at: V3 = [b.neck[0] - 0.08 + t * 0.3, b.neck[1] + 0.12 + t * 0.55, 0];
        rig.add('body', mane, limb(at, [at[0] - 0.2, at[1] - 0.05 + (i % 2) * 0.06, (i % 2 ? 1 : -1) * 0.05], 0.07, 0.0, 4));
      }
      rig.joint('head', head);
      rig.add(
        'head',
        c,
        blob([0.15, 0.13, 0.12], [0.02, 0.02, 0]),
        limb([0.06, -0.02, 0], [0.38, -0.24, 0], 0.11, 0.075),
        limb([-0.02, 0.1, 0.07], [-0.05, 0.27, 0.08], 0.05, 0.0, 4),
        limb([-0.02, 0.1, -0.07], [-0.05, 0.27, -0.08], 0.05, 0.0, 4),
      );
      rig.add('head', 0xf3ebcd, limb([0.08, 0.13, 0], [0.32, 0.58, 0], 0.04, 0.0, 6));
      rig.joint('tail', b.tail);
      rig.add(
        'tail',
        mane,
        chain(
          [
            [0, 0, 0],
            [-0.18, -0.2, 0],
            [-0.26, -0.55, 0.02],
            [-0.22, -0.85, 0.03],
          ],
          [0.06, 0.1, 0.08, 0.02],
          6,
        ),
      );
      return { length: 2.0, height: 2.4 };
    },
    mammoth(rig) {
      const c = 0xbcb3b7;
      const back = 0x7a7279;
      const b = quadruped(rig, {
        color: back,
        L: 1.9,
        H: 1.25,
        W: 1.0,
        legLength: 0.75,
        legRadius: [0.22, 0.18],
        chest: 1.15,
        hump: 0.45,
        legColor: 0x8a8288,
      });
      rig.add('body', c, blob([0.5, 0.62, 0.52], [b.neck[0] - 0.12, b.neck[1] - 0.05, 0]));
      rig.joint('head', [b.neck[0] + 0.2, b.neck[1] + 0.2, 0]);
      rig.add(
        'head',
        c,
        blob([0.34, 0.4, 0.33], [0.05, 0.05, 0]),
        blob([0.1, 0.16, 0.06], [-0.12, -0.05, 0.3], [0, 0, 0], 0),
        blob([0.1, 0.16, 0.06], [-0.12, -0.05, -0.3], [0, 0, 0], 0),
        chain(
          [
            [0.28, -0.15, 0],
            [0.4, -0.5, 0],
            [0.44, -0.85, 0],
            [0.6, -1.0, 0],
            [0.82, -0.92, 0],
            [0.9, -0.75, 0],
          ],
          [0.15, 0.13, 0.1, 0.08, 0.065, 0.05],
          6,
        ),
      );
      for (const z of [0.16, -0.16])
        rig.add(
          'head',
          0xf1ead8,
          chain(
            [
              [0.3, -0.3, z],
              [0.5, -0.62, z * 1.3],
              [0.78, -0.62, z * 1.25],
              [0.92, -0.38, z * 0.8],
            ],
            [0.055, 0.05, 0.035, 0.006],
            5,
          ),
        );
      rig.joint('tail', b.tail);
      rig.add(
        'tail',
        back,
        chain(
          [
            [0, 0, 0],
            [-0.1, -0.3, 0],
          ],
          [0.05, 0.03],
          4,
        ),
      );
      return { length: 2.6, height: 2.75 };
    },
    rhino(rig) {
      const c = 0xb8c7cd;
      const b = quadruped(rig, {
        color: c,
        L: 1.9,
        H: 0.88,
        W: 0.8,
        legLength: 0.48,
        legRadius: [0.17, 0.14],
        chest: 1.12,
        hump: 0.2,
        feetColor: 0x8a989e,
      });
      rig.add('body', c, limb(b.neck, [b.neck[0] + 0.26, b.neck[1] - 0.2, 0], 0.38, 0.28));
      rig.joint('head', [b.neck[0] + 0.3, b.neck[1] - 0.24, 0]);
      rig.add(
        'head',
        c,
        blob([0.3, 0.22, 0.22], [0.12, 0, 0]),
        blob([0.18, 0.17, 0.18], [0.4, -0.08, 0]),
        limb([0.0, 0.16, 0.12], [-0.06, 0.32, 0.15], 0.06, 0.0, 4),
        limb([0.0, 0.16, -0.12], [-0.06, 0.32, -0.15], 0.06, 0.0, 4),
      );
      rig.add(
        'head',
        0xdfe5e6,
        limb([0.46, 0.05, 0], [0.62, 0.46, 0], 0.085, 0.0, 5),
        limb([0.26, 0.15, 0], [0.32, 0.33, 0], 0.06, 0.0, 5),
      );
      rig.joint('tail', b.tail);
      rig.add(
        'tail',
        c,
        chain(
          [
            [0, 0, 0],
            [-0.06, -0.28, 0],
          ],
          [0.035, 0.02],
          4,
        ),
      );
      return { length: 2.5, height: 1.75 };
    },
    owl(rig) {
      const c = 0xece8dd;
      const wing = 0xd3d3cb;
      rig.add('body', c, blob([0.22, 0.3, 0.21], [0, 0, 0], [0, 0, -0.6]));
      rig.joint('head', [0.16, 0.22, 0]);
      rig.add('head', c, blob([0.17, 0.16, 0.17], [0.03, 0.04, 0]), blob([0.05, 0.14, 0.14], [0.13, 0.02, 0], [0, 0, 0], 1));
      rig.add(
        'head',
        0x3a3530,
        blob([0.025, 0.03, 0.025], [0.2, 0.06, 0.06], [0, 0, 0], 0),
        blob([0.025, 0.03, 0.025], [0.2, 0.06, -0.06], [0, 0, 0], 0),
      );
      rig.add('head', 0xb9a88c, limb([0.17, 0.0, 0], [0.24, -0.06, 0], 0.025, 0.0, 4));
      for (const side of [1, -1]) {
        const name = side > 0 ? 'wingL' : 'wingR';
        rig.joint(name, [0.02, 0.1, side * 0.14]);
        const edge: V3[] = [
          [0.1, 0.03, 0.18],
          [0.12, 0.06, 0.42],
          [0.06, 0.08, 0.66],
          [-0.08, 0.06, 0.86],
          [-0.2, 0.04, 0.8],
          [-0.24, 0.02, 0.62],
          [-0.3, 0.0, 0.5],
          [-0.3, 0.0, 0.34],
          [-0.26, 0.0, 0.2],
          [-0.18, 0.0, 0.04],
        ].map(([x, y, z]) => [x, y, z * side]);
        rig.add(name, wing, fan([0, 0, 0], side > 0 ? edge : [...edge].reverse()));
      }
      rig.joint('tailFan', [-0.22, -0.12, 0]);
      rig.add(
        'tailFan',
        wing,
        fan(
          [0, 0, 0],
          [
            [-0.18, -0.04, 0.1],
            [-0.26, -0.06, 0.03],
            [-0.26, -0.06, -0.03],
            [-0.18, -0.04, -0.1],
          ],
        ),
      );
      rig.add(
        'body',
        0xb9a88c,
        limb([0.0, -0.22, 0.06], [0.1, -0.33, 0.07], 0.03, 0.012, 4),
        limb([0.0, -0.22, -0.06], [0.1, -0.33, -0.07], 0.03, 0.012, 4),
      );
      return { length: 0.9, height: 0.8 };
    },
  };

  function build(kind: AnimalKind, seed = 1): Animal {
    const rig = new Rig(seed * 101);
    const size = builders[kind](rig);
    rig.build();
    const j = rig.joints;
    const flies = kind === 'owl';
    // The rig bobs inside an outer group, which the scene is free to place.
    const root = new THREE.Group();
    root.add(rig.root);
    return {
      kind,
      root,
      length: size.length,
      height: size.height,
      flies,
      pose(time, walk, phase) {
        const t = time + phase;
        if (flies) {
          const flap = Math.sin(t * 7) * 0.65;
          j.wingL!.rotation.x = -flap - 0.1;
          j.wingR!.rotation.x = flap + 0.1;
          j.head!.rotation.y = Math.sin(t * 0.7) * 0.35;
          j.tailFan!.rotation.z = Math.sin(t * 7 + 1) * 0.08;
          rig.root.position.y = Math.sin(t * 7 - 0.6) * 0.03;
          return;
        }
        // Breathing, looking about, a swishing tail; legs swing in pairs when walking.
        rig.body!.scale.y = 1 + Math.sin(t * 1.6) * 0.012;
        if (j.head) {
          j.head.rotation.z = Math.sin(t * 0.9) * 0.05 + walk * Math.sin(t * 8) * 0.04;
          j.head.rotation.y = Math.sin(t * 0.37) * 0.22 * (1 - walk);
        }
        if (j.tail) {
          j.tail.rotation.y = Math.sin(t * 1.3) * 0.3;
          j.tail.rotation.z = Math.sin(t * 0.8) * 0.08;
        }
        const step = t * 7;
        const swing = 0.42 * walk;
        if (j.legFL) j.legFL.rotation.z = Math.sin(step) * swing;
        if (j.legBR) j.legBR.rotation.z = Math.sin(step) * swing;
        if (j.legFR) j.legFR.rotation.z = Math.sin(step + Math.PI) * swing;
        if (j.legBL) j.legBL.rotation.z = Math.sin(step + Math.PI) * swing;
        rig.root.position.y = Math.abs(Math.sin(step)) * 0.03 * walk;
      },
    };
  }

  return { build };
}
