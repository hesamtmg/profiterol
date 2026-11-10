/**
 * Two scroll journeys in 3D, driven by how far the visitor has scrolled through their section:
 *
 * - jungle: a walk down a path through a low-poly jungle (faceted trees, ferns, rocks, light shafts, fireflies, mist).
 *           Kasra's animals, cut-out pictures made solid (picture-sculpture), stand in clearings beside the path; the
 *           camera stops by each one in turn.
 * - galaxy: a flight into a spiral galaxy of glowing dust and nebulae. Kasra's planets, globes made from round
 *           pictures (planet-kit), hang along the way in toward the core; the camera swings past each one in turn.
 *
 * The camera lingers at each stop and moves on between them, and the name of the animal or planet being visited is
 * reported for the page to show.
 */
import type * as Three from 'three';
import { hash, planetKit } from './planet-kit';
import { sculpt } from './picture-sculpture';

export type CosmosKind = 'jungle' | 'galaxy';
export interface CosmosPlanet {
  image: string;
  name: string;
}
export interface CosmosAnimal {
  image: string;
  name: string;
  /** Height next to the others (1 = usual). */
  size: number;
  /** Which way the animal looks in its picture. */
  faces: 'left' | 'right';
  /** Hovers above the ground instead of standing on it. */
  flies?: boolean;
}
export interface CosmosOptions {
  kind: CosmosKind;
  planets: CosmosPlanet[];
  animals: CosmosAnimal[];
  /** How much of each planet picture's width the round planet takes up, 0–1. */
  fill: number;
  still: boolean;
  /** The name of the animal or planet being visited, or null between them. */
  onLabel?: (name: string | null) => void;
}

/** Shapes coloured triangle by triangle, nudged so no two facets line up: the low-poly look of Kasra's work. */
function faceted(THREE: typeof Three) {
  const parts: Three.BufferGeometry[] = [];
  const tmp = new THREE.Color();
  let seed = 1;
  function add(geometry: Three.BufferGeometry, color: number, { shade = 0.08, jitter = 0 } = {}) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    const pos = g.attributes.position as Three.BufferAttribute;
    if (jitter) {
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const k = Math.round(x * 97) * 7.1 + Math.round(y * 89) * 3.3 + Math.round(z * 83) * 1.7;
        pos.setXYZ(i, x + (hash(k) - 0.5) * jitter, y + (hash(k + 1) - 0.5) * jitter, z + (hash(k + 2) - 0.5) * jitter);
      }
    }
    const base = new THREE.Color(color);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);
    const colors = new Float32Array(pos.count * 3);
    for (let t = 0; t < pos.count / 3; t++) {
      tmp.setHSL(
        hsl.h + (hash(seed * 3.1 + t) - 0.5) * 0.03,
        hsl.s,
        Math.min(1, Math.max(0, hsl.l + (hash(seed + t * 1.37) - 0.5) * 2 * shade)),
      );
      for (let k = 0; k < 3; k++) colors.set([tmp.r, tmp.g, tmp.b], (t * 3 + k) * 3);
    }
    seed += 17;
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(g);
  }
  function mesh(material: Three.Material) {
    let count = 0;
    for (const g of parts) count += g.attributes.position!.count;
    const position = new Float32Array(count * 3);
    const color = new Float32Array(count * 3);
    let o = 0;
    for (const g of parts) {
      position.set(g.attributes.position!.array as Float32Array, o * 3);
      color.set(g.attributes.color!.array as Float32Array, o * 3);
      o += g.attributes.position!.count;
      g.dispose();
    }
    parts.length = 0;
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(position, 3));
    merged.setAttribute('color', new THREE.BufferAttribute(color, 3));
    merged.computeVertexNormals();
    return new THREE.Mesh(merged, material);
  }
  return { add, mesh };
}

/** A soft round glow, drawn once, for sprites and points. */
function glowTexture(THREE: typeof Three, inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,0.35)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.3, mid);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** A soft, lumpy cloud for nebulae and mist. */
function cloudTexture(THREE: typeof Three, seed: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 26; i++) {
    const x = 128 + (hash(seed + i) - 0.5) * 140;
    const y = 128 + (hash(seed + i + 50) - 0.5) * 140;
    const r = 30 + hash(seed + i + 99) * 70;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(c);
}

/** Spends most of a segment near its two ends, so the camera lingers at each stop. */
const dwell = (f: number) => f - Math.sin(f * Math.PI * 2) / (Math.PI * 2);

export function cosmosScene(THREE: typeof Three, canvas: HTMLCanvasElement, o: CosmosOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 400);
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(thing: T) => (disposables.push(thing), thing);
  const sculptures: Three.Mesh[] = [];
  const loads: Promise<unknown>[] = [];

  /** Where the camera stands and looks at each stop: the first is the way in, the last the way out. */
  const stops: { at: Three.Vector3; look: Three.Vector3; name: string | null }[] = [];
  let tick: (time: number, dt: number) => void = () => {};

  // ---------------------------------------------------------------- the jungle
  function jungle() {
    const sky = new THREE.Color(0x0d2418);
    scene.background = sky;
    scene.fog = new THREE.FogExp2(sky, 0.045);
    scene.add(new THREE.HemisphereLight(0xd8f0b0, 0x2a4a2a, 1.9));
    const sun = new THREE.DirectionalLight(0xfff0c8, 2.2);
    sun.position.set(-6, 14, 4);
    scene.add(sun);
    // The animals' pictures carry their own shading: soft extra light keeps them as bright as the artwork.
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const animals = o.animals.slice(0, 10);
    const GAP = 9;
    const spots = animals.map((a, i) => ({ a, x: i % 2 ? 2.7 : -2.7, z: -8 - i * GAP }));
    const end = -8 - Math.max(0, animals.length - 1) * GAP - 14;
    const pathX = (z: number) => Math.sin(z * 0.07) * 0.9;
    // Nothing grows in an animal's clearing, nor between it and the path where the camera stops to look.
    const clear = (x: number, z: number) =>
      spots.every((s) => Math.hypot(x - s.x, (z - s.z) * 0.8) > 3.2 && !(z > s.z && z < s.z + 4 && Math.abs(x - s.x * 0.6) < 2.6));

    const land = faceted(THREE);
    // The ground: a faceted floor rising into banks away from the path.
    const ground = new THREE.PlaneGeometry(60, Math.abs(end) + 60, 90, Math.round((Math.abs(end) + 60) * 1.6));
    ground.rotateX(-Math.PI / 2);
    ground.translate(0, 0, end / 2);
    const gp = ground.attributes.position as Three.BufferAttribute;
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i);
      const z = gp.getZ(i);
      const off = Math.abs(x - pathX(z));
      const bank = Math.max(0, off - 3.5);
      gp.setY(i, bank * bank * 0.04 + (hash(Math.round(x * 3) * 31 + Math.round(z * 3)) - 0.5) * 0.25 * Math.min(1, off / 3));
    }
    land.add(ground, 0x2c5232, { shade: 0.035 });
    // The path: a strip of lighter, earthy ground.
    for (let z = 6; z > end; z -= 1.2) {
      const step = new THREE.CircleGeometry(0.9 + hash(z) * 0.3, 7);
      step.rotateX(-Math.PI / 2);
      step.translate(pathX(z) + (hash(z * 3) - 0.5) * 0.4, 0.03, z);
      land.add(step, 0x6b5f3e, { shade: 0.04 });
    }
    // Trees: broad canopies of faceted balls, tall cone trees, and palms; thicker toward the sides.
    let n = 0;
    for (let z = 10; z > end - 10; z -= 0.9) {
      for (const side of [-1, 1]) {
        n++;
        const x = pathX(z) + side * (4 + hash(n) * 12);
        if (!clear(x, z) || hash(n + 7) < 0.35) continue;
        const kind = hash(n + 13);
        const h = 3 + hash(n + 19) * 4;
        const lean = (hash(n + 23) - 0.5) * 0.3;
        if (kind < 0.55) {
          land.add(new THREE.CylinderGeometry(0.12, 0.22, h, 5).translate(x, h / 2, z).rotateZ(0), 0x4a3424, { shade: 0.06 });
          for (let k = 0; k < 3; k++) {
            const r = 0.9 + hash(n * 3 + k) * 1.1;
            const g = new THREE.IcosahedronGeometry(r, 0);
            g.scale(1, 0.8, 1);
            g.translate(
              x + (hash(n + k * 5) - 0.5) * 1.6 + lean * h,
              h + (hash(n + k * 9) - 0.2) * 1.1,
              z + (hash(n + k * 11) - 0.5) * 1.6,
            );
            land.add(g, k % 2 ? 0x2f6a35 : 0x3d7d3a, { shade: 0.12, jitter: 0.25 });
          }
        } else if (kind < 0.8) {
          land.add(new THREE.CylinderGeometry(0.08, 0.16, h * 0.4, 5).translate(x, h * 0.2, z), 0x3d2a1e);
          for (let k = 0; k < 3; k++) {
            const g = new THREE.ConeGeometry(1.4 - k * 0.35, 1.8, 6);
            g.translate(x, h * 0.4 + 0.6 + k * 1.05, z);
            land.add(g, 0x1f5532, { shade: 0.12, jitter: 0.15 });
          }
        } else {
          // A palm: a curved trunk and a crown of leaves.
          const top = new THREE.Vector3(x + lean * 4, h + 1, z);
          land.add(new THREE.CylinderGeometry(0.1, 0.18, h + 1, 5).translate(x + lean * 2, (h + 1) / 2, z), 0x5a4630);
          for (let k = 0; k < 7; k++) {
            const a = (k / 7) * Math.PI * 2;
            const leaf = new THREE.ConeGeometry(0.35, 2.4, 3);
            leaf.translate(0, 1.2, 0);
            leaf.scale(1, 1, 0.25);
            leaf.rotateZ(-1.9);
            leaf.rotateY(a);
            leaf.translate(top.x, top.y, top.z);
            land.add(leaf, 0x4a8a3a, { shade: 0.12 });
          }
        }
      }
    }
    // Ferns and bushes along the path's edges, and a few rocks.
    for (let z = 8; z > end; z -= 0.7) {
      n++;
      const side = hash(n) < 0.5 ? -1 : 1;
      const x = pathX(z) + side * (1.9 + hash(n + 3) * 2.2);
      if (!clear(x, z)) continue;
      if (hash(n + 9) < 0.6) {
        for (let k = 0; k < 6; k++) {
          const frond = new THREE.ConeGeometry(0.16, 1.1, 3);
          frond.translate(0, 0.55, 0);
          frond.scale(1, 1, 0.3);
          frond.rotateZ(-0.7 - hash(n + k) * 0.5);
          frond.rotateY((k / 6) * Math.PI * 2 + hash(n));
          frond.translate(x, 0, z);
          land.add(frond, 0x3f8d45, { shade: 0.12 });
        }
      } else if (hash(n + 9) < 0.85) {
        const b = new THREE.IcosahedronGeometry(0.5 + hash(n + 11) * 0.5, 0);
        b.scale(1.3, 0.8, 1);
        b.translate(x, 0.3, z);
        land.add(b, 0x2c6b33, { shade: 0.12, jitter: 0.15 });
      } else {
        const r = new THREE.DodecahedronGeometry(0.3 + hash(n + 13) * 0.4, 0);
        r.scale(1.2, 0.7, 1);
        r.translate(x, 0.12, z);
        land.add(r, 0x6d6a62, { shade: 0.1, jitter: 0.1 });
      }
    }
    const landMaterial = keep(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));
    const landMesh = land.mesh(landMaterial);
    keep(landMesh.geometry);
    scene.add(landMesh);

    // Shafts of light falling through the canopy.
    const shaftTexture = keep(glowTexture(THREE, 'rgba(255,245,200,0.5)', 'rgba(255,240,190,0.18)'));
    const shaftMaterial = keep(
      new THREE.MeshBasicMaterial({
        map: shaftTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.55,
        fog: false,
        side: THREE.DoubleSide,
      }),
    );
    const shaftGeometry = keep(new THREE.PlaneGeometry(2.2, 16));
    for (let z = -4; z > end; z -= 7) {
      const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
      shaft.position.set(pathX(z) + (hash(z) - 0.5) * 5, 6, z);
      shaft.rotation.set(0, (hash(z * 2) - 0.5) * 0.8, 0.35);
      scene.add(shaft);
    }
    // Fireflies.
    const flyCount = 260;
    const flies = new Float32Array(flyCount * 3);
    const flyBase = new Float32Array(flyCount * 3);
    for (let i = 0; i < flyCount; i++) {
      flyBase.set([(hash(i + 900) - 0.5) * 16, 0.4 + hash(i + 901) * 3.5, 8 + hash(i + 902) * (end - 8)], i * 3);
    }
    const flyGeometry = keep(new THREE.BufferGeometry());
    flyGeometry.setAttribute('position', new THREE.BufferAttribute(flies, 3));
    const flyMaterial = keep(
      new THREE.PointsMaterial({
        map: keep(glowTexture(THREE)),
        color: 0xe8ff9a,
        size: 0.22,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    scene.add(new THREE.Points(flyGeometry, flyMaterial));

    // The animals, each in its clearing, looking across the path.
    const loader = new THREE.ImageLoader();
    loader.setCrossOrigin('anonymous');
    const placed: { mesh: Three.Mesh; flies: boolean; y: number; i: number }[] = [];
    spots.forEach(({ a, x, z }, i) => {
      loads.push(
        loader
          .loadAsync(a.image)
          .then((picture) => {
            const toRight = x < 0;
            const { mesh } = sculpt(THREE, picture, { height: 1.7 * (a.size || 1), flip: (a.faces === 'right') !== toRight, depth: 0.9 });
            sculptures.push(mesh);
            const y = a.flies ? 2.2 : 0;
            mesh.position.set(x, y, z);
            mesh.rotation.y = x < 0 ? 0.35 : -0.35;
            scene.add(mesh);
            placed.push({ mesh, flies: Boolean(a.flies), y, i });
          })
          .catch(() => undefined),
      );
    });

    const eye = 1.45;
    stops.push({ at: new THREE.Vector3(pathX(6), eye, 6), look: new THREE.Vector3(pathX(-6), eye - 0.2, -6), name: null });
    for (const s of spots) {
      const z = s.z + 2.9;
      const tall = 1.7 * (s.a.size || 1);
      stops.push({
        at: new THREE.Vector3(pathX(z) + s.x * 0.3, Math.max(1.1, tall * 0.75) + (s.a.flies ? 1.2 : 0), z),
        look: new THREE.Vector3(s.x * 0.95, tall * 0.5 + (s.a.flies ? 2.2 : 0), s.z),
        name: s.a.name,
      });
    }
    stops.push({
      at: new THREE.Vector3(pathX(end + 4), eye + 0.3, end + 4),
      look: new THREE.Vector3(pathX(end - 10), eye + 1.2, end - 10),
      name: null,
    });

    tick = (time) => {
      for (let i = 0; i < flyCount; i++) {
        flies[i * 3] = flyBase[i * 3]! + Math.sin(time * 0.6 + i) * 0.4;
        flies[i * 3 + 1] = flyBase[i * 3 + 1]! + Math.sin(time * 0.9 + i * 1.7) * 0.3;
        flies[i * 3 + 2] = flyBase[i * 3 + 2]! + Math.cos(time * 0.5 + i) * 0.4;
      }
      flyGeometry.attributes.position!.needsUpdate = true;
      flyMaterial.opacity = 0.6 + Math.sin(time * 3) * 0.2;
      for (const p of placed) {
        p.mesh.scale.y = 1 + Math.sin(time * 1.6 + p.i) * 0.008;
        if (p.flies) p.mesh.position.y = p.y + Math.sin(time * 1.3 + p.i) * 0.18;
      }
    };
  }

  // ---------------------------------------------------------------- the galaxy
  function galaxy() {
    scene.background = new THREE.Color(0x05040b);
    const kit = planetKit(THREE, renderer, { fill: o.fill, accent: new THREE.Color(0xffffff), dark: true });
    keep(kit);
    kit.light(scene, new THREE.Vector3(0, 0, 0));

    // A spiral galaxy of glowing dust: a warm core, blue-violet arms, pink at the edges.
    const galaxyGroup = new THREE.Group();
    galaxyGroup.rotation.x = 0.12;
    scene.add(galaxyGroup);
    const R = 70;
    const count = 48000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const core = new THREE.Color(0xffe2b0);
    const arm = new THREE.Color(0x6f86ff);
    const rim = new THREE.Color(0xff7ad0);
    const c = new THREE.Color();
    const gauss = (k: number) => (hash(k) + hash(k + 0.31) + hash(k + 0.73) - 1.5) / 1.5;
    for (let i = 0; i < count; i++) {
      const r = Math.pow(hash(i * 1.1), 1.7) * R;
      const branch = (i % 3) * ((Math.PI * 2) / 3);
      const spin = r * 0.085;
      const spread = 0.35 + (r / R) * 0.35;
      const a = branch + spin + gauss(i * 2.3) * spread;
      const thick = (1 - r / R) * 2.2 + 0.25;
      positions.set([Math.cos(a) * r + gauss(i * 3.7) * 1.2, gauss(i * 5.1) * thick, Math.sin(a) * r + gauss(i * 7.9) * 1.2], i * 3);
      const t = r / R;
      c.copy(core)
        .lerp(arm, Math.min(1, t * 2.2))
        .lerp(rim, Math.max(0, t - 0.55) * 1.6);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    const dustGeometry = keep(new THREE.BufferGeometry());
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const dustMaterial = keep(
      new THREE.PointsMaterial({
        map: keep(glowTexture(THREE)),
        size: 0.26,
        opacity: 0.9,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    galaxyGroup.add(new THREE.Points(dustGeometry, dustMaterial));
    // Nebulae drifting in the arms, and the glow of the core.
    const nebulaColors = [0x7b4dff, 0x2f7bff, 0xff4fb0, 0x6fd6ff, 0xb05cff];
    for (let i = 0; i < 22; i++) {
      const r = 8 + hash(i + 300) * (R - 12);
      const a = (i % 3) * ((Math.PI * 2) / 3) + r * 0.085 + (hash(i + 301) - 0.5) * 0.6;
      const material = keep(
        new THREE.SpriteMaterial({
          map: keep(cloudTexture(THREE, i * 13)),
          color: nebulaColors[i % nebulaColors.length],
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      const sprite = new THREE.Sprite(material);
      sprite.position.set(Math.cos(a) * r, (hash(i + 302) - 0.5) * 2, Math.sin(a) * r);
      sprite.scale.setScalar(8 + hash(i + 303) * 10);
      galaxyGroup.add(sprite);
    }
    const coreGlow = new THREE.Sprite(
      keep(
        new THREE.SpriteMaterial({
          map: keep(glowTexture(THREE, 'rgba(255,236,200,1)', 'rgba(255,190,120,0.4)')),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    coreGlow.scale.setScalar(30);
    galaxyGroup.add(coreGlow);
    // Far stars all round.
    const far = new Float32Array(1600 * 3);
    for (let i = 0; i < 1600; i++) {
      const u = hash(i + 501) * 2 - 1;
      const t = hash(i + 601) * Math.PI * 2;
      const s = Math.sqrt(1 - u * u) * 180;
      far.set([Math.cos(t) * s, u * 180, Math.sin(t) * s], i * 3);
    }
    const farGeometry = keep(new THREE.BufferGeometry());
    farGeometry.setAttribute('position', new THREE.BufferAttribute(far, 3));
    scene.add(
      new THREE.Points(
        farGeometry,
        keep(new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.8 })),
      ),
    );

    // The planets, along a spiral in toward the core, each beside the dust lane.
    const planets = o.planets.slice(0, 10);
    const spots = planets.map((p, i) => {
      const r = 46 - i * (34 / Math.max(1, planets.length));
      const a = 0.6 + i * 0.62;
      const size = 1.6 + hash(i + 77) * 1.2;
      const made = kit.make(p.image, size);
      loads.push(made.loaded);
      const pos = new THREE.Vector3(Math.cos(a) * r, (hash(i + 78) - 0.5) * 3, Math.sin(a) * r);
      made.body.position.copy(pos);
      made.glow.position.copy(pos);
      made.body.rotation.set(0.25, hash(i) * 6, 0.2);
      scene.add(made.body, made.glow);
      return { p, pos, size, a, body: made.body };
    });

    // From far above the galaxy, down into it, past each planet, to the core.
    stops.push({ at: new THREE.Vector3(0, 70, 95), look: new THREE.Vector3(0, -4, 0), name: null });
    for (const s of spots) {
      // Stand a little before the planet along the way in, off to one side, and look at it.
      const ahead = new THREE.Vector3(-Math.sin(s.a), 0, Math.cos(s.a));
      const outward = new THREE.Vector3(Math.cos(s.a), 0, Math.sin(s.a));
      const at = s.pos
        .clone()
        .addScaledVector(ahead, -s.size * 3.4)
        .addScaledVector(outward, s.size * 1.6)
        .add(new THREE.Vector3(0, s.size * 0.6, 0));
      stops.push({ at, look: s.pos.clone(), name: s.p.name });
    }
    stops.push({ at: new THREE.Vector3(10, 6, 14), look: new THREE.Vector3(0, 0, 0), name: null });

    tick = (time, dt) => {
      galaxyGroup.rotation.y = time * 0.01;
      for (const s of spots) s.body.rotation.y += dt * 0.15;
    };
  }

  if (o.kind === 'galaxy') galaxy();
  else jungle();

  const path = new THREE.CatmullRomCurve3(stops.map((s) => s.at));
  const looks = new THREE.CatmullRomCurve3(stops.map((s) => s.look));
  let progress = 0;
  let shown = 0;
  let width = 0;
  let height = 0;
  let time = 0;
  let lastName: string | null | undefined;
  const sway = { x: 0, y: 0, toX: 0, toY: 0 };

  function aim(dt: number) {
    // The camera eases toward where the scroll says it should be, so jumps in the scroll stay smooth.
    shown += (progress - shown) * (dt ? Math.min(1, dt * 4) : 1);
    const legs = stops.length - 1;
    const u = shown * legs;
    const k = Math.min(legs - 1, Math.floor(u));
    const t = (k + dwell(Math.min(1, u - k))) / legs;
    camera.position.copy(path.getPoint(t));
    const look = looks.getPoint(t);
    sway.x += (sway.toX - sway.x) * Math.min(1, dt * 3);
    sway.y += (sway.toY - sway.y) * Math.min(1, dt * 3);
    camera.position.x += sway.x * 0.4;
    camera.position.y += sway.y * 0.25;
    camera.lookAt(look);
    // The name of the stop the camera is lingering at.
    const near = Math.round(u);
    const name = Math.abs(u - near) < 0.3 ? (stops[near]?.name ?? null) : null;
    if (name !== lastName) {
      lastName = name;
      o.onLabel?.(name);
    }
  }
  function render() {
    if (width && height) renderer.render(scene, camera);
  }

  return {
    ready: Promise.all(loads).then(() => {
      aim(0);
      render();
    }),
    resize(w: number, h: number) {
      if (!w || !h) return;
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? 68 : 50;
      camera.updateProjectionMatrix();
      aim(0);
      render();
    },
    frame(dt: number) {
      if (!o.still) {
        time += dt;
        tick(time, dt);
      }
      aim(dt);
      render();
    },
    /** How far through its section the page has scrolled, 0–1. */
    scroll(p: number) {
      progress = Math.min(1, Math.max(0, p));
      if (o.still) {
        aim(0);
        render();
      }
    },
    /** Pointer over the canvas, −1…1 across and up; null when it leaves. */
    point(x: number | null, y = 0) {
      sway.toX = x ?? 0;
      sway.toY = x === null ? 0 : y;
    },
    still(on: boolean) {
      o.still = on;
      render();
    },
    dispose() {
      for (const m of sculptures) (m.userData.dispose as () => void)();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
