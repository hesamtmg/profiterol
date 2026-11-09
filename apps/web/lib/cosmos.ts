/**
 * Scenes of Kasra's animals and planets together, in 3D. Planets are globes made from round pictures (planet-kit);
 * animals are cut-out pictures made solid (picture-sculpture). Four scenes:
 *
 * - worlds:  each animal stands on its own little planet, like the Little Prince; the worlds float on a slowly
 *            turning ring that can be dragged round, and the one under the pointer comes forward with its name.
 * - horizon: the animals march along the curved top of one huge planet, the other planets rising and setting in
 *            the sky behind; scrolling turns the big planet further.
 * - parade:  the planets orbit a glowing sun, each with an animal riding on top, facing the way it travels.
 * - journey: a flight past the planets, one after another, each with its animal, driven by scrolling.
 *
 * The planet under each animal turns beneath its feet, so every animal seems to walk on its own world.
 */
import type * as Three from 'three';
import { hash, planetKit } from './planet-kit';
import { sculpt } from './picture-sculpture';

export type CosmosKind = 'worlds' | 'horizon' | 'parade' | 'journey';
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
export interface CosmosLabel {
  name: string;
  /** Position on the canvas, in % of its width and height. */
  x: number;
  y: number;
}
export interface CosmosOptions {
  kind: CosmosKind;
  planets: CosmosPlanet[];
  animals: CosmosAnimal[];
  /** How much of each planet picture's width the round planet takes up, 0–1. */
  fill: number;
  still: boolean;
  /** The name to show by the pointer (worlds, parade) or for the world being passed (journey). */
  onLabel?: (label: CosmosLabel | null) => void;
}

/** An animal standing on top of its planet. */
interface Rider {
  group: Three.Group;
  planet: Three.Mesh | null;
  glow: Three.Mesh | null;
  animal: Three.Mesh | null;
  radius: number;
  name: string;
  spin: number;
  /** Eased size, for the one under the pointer. */
  lift: number;
  /** Current turn (parade), eased toward the way it travels. */
  yaw: number;
}

export function cosmosScene(THREE: typeof Three, canvas: HTMLCanvasElement, o: CosmosOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(o.kind === 'journey' ? 50 : 32, 1, 0.05, 200);
  const kit = planetKit(THREE, renderer, { fill: o.fill, accent: new THREE.Color(0xffffff), dark: true });
  kit.light(scene);
  // The animals' pictures carry their own shading: a soft fill keeps them as bright as the artwork.
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  // Stars all round.
  const starCount = 1400;
  const stars = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = hash(i + 501) * 2 - 1;
    const t = hash(i + 601) * Math.PI * 2;
    const r = 60 + hash(i + 701) * 30;
    const s = Math.sqrt(1 - u * u) * r;
    stars.set([Math.cos(t) * s, u * r, Math.sin(t) * s], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.7 });
  scene.add(new THREE.Points(starGeometry, starMaterial));
  kit.keep(starGeometry);
  kit.keep(starMaterial);

  const loader = new THREE.ImageLoader();
  loader.setCrossOrigin('anonymous');
  const animalPictures = new Map<string, HTMLImageElement>();
  const sculptures: Three.Mesh[] = [];
  const loads: Promise<unknown>[] = o.animals.map((a) =>
    loader
      .loadAsync(a.image)
      .then((img) => void animalPictures.set(a.image, img))
      .catch(() => undefined),
  );

  /** An animal made solid, `height` tall, turned to look right (or left), or as drawn when `toRight` is null. */
  function animalMesh(a: CosmosAnimal, height: number, toRight: boolean | null) {
    const picture = animalPictures.get(a.image);
    if (!picture) return null;
    const flip = toRight === null ? false : (a.faces === 'right') !== toRight;
    const { mesh } = sculpt(THREE, picture, { height: height * (a.size || 1), flip, depth: 0.9 });
    sculptures.push(mesh);
    return mesh;
  }

  /** A planet with an animal standing on it. */
  function rider(i: number, radius: number, animalHeight: number, toRight: boolean | null): Rider {
    const group = new THREE.Group();
    const p = o.planets.length ? o.planets[i % o.planets.length]! : null;
    const a = o.animals[i];
    let planet: Three.Mesh | null = null;
    let glow: Three.Mesh | null = null;
    if (p) {
      const made = kit.make(p.image, radius);
      loads.push(made.loaded);
      planet = made.body;
      glow = made.glow;
      planet.rotation.set(0.3 * (hash(i + 3) - 0.5), hash(i + 5) * 6, 0.25);
      group.add(planet, glow);
    }
    const r: Rider = {
      group,
      planet,
      glow,
      animal: null,
      radius,
      name: a?.name || p?.name || '',
      spin: 0.25 + hash(i + 9) * 0.25,
      lift: 0,
      yaw: 0,
    };
    if (a) {
      r.animal = animalMesh(a, animalHeight, toRight);
      if (r.animal) {
        // Feet just sinking into the planet's surface.
        r.animal.position.y = (p ? radius * 0.94 : 0) + (a.flies ? radius * 0.9 : 0);
        group.add(r.animal);
      }
    }
    return r;
  }

  const count = Math.min(8, Math.max(o.kind === 'horizon' ? 0 : o.planets.length, o.animals.length));
  const riders: Rider[] = [];
  let big: { body: Three.Mesh; glow: Three.Mesh } | null = null;
  const walkers: { mesh: Three.Mesh; base: number; flies: boolean }[] = [];
  const sky: { group: Three.Group; planet: Three.Mesh; base: number }[] = [];
  const walkerGroup = new THREE.Group();
  const skyGroup = new THREE.Group();
  const ring = new THREE.Group();
  let sun: Three.Sprite | null = null;

  // ---------- Building each scene (once the animal pictures are in) ----------
  const BIG = 26;
  const SPACING = 0.072;
  function build() {
    if (o.kind === 'worlds') {
      scene.add(ring);
      const R = Math.max(2.2, count * 0.62);
      for (let i = 0; i < count; i++) {
        const r = rider(i, 0.55, 1.05, null);
        const a = (i / count) * Math.PI * 2;
        r.group.position.set(Math.sin(a) * R, (hash(i + 21) - 0.5) * 0.6, Math.cos(a) * R);
        ring.add(r.group);
        riders.push(r);
      }
    } else if (o.kind === 'parade') {
      for (let i = 0; i < count; i++) {
        const r = rider(i, 0.36, 0.72, true);
        scene.add(r.group);
        riders.push(r);
      }
      // A soft sun in the middle.
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = glowCanvas.height = 128;
      const g = glowCanvas.getContext('2d')!;
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,240,200,1)');
      grad.addColorStop(0.25, 'rgba(255,200,110,0.55)');
      grad.addColorStop(1, 'rgba(255,170,60,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      const texture = new THREE.CanvasTexture(glowCanvas);
      const material = new THREE.SpriteMaterial({ map: texture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
      sun = new THREE.Sprite(material);
      sun.scale.setScalar(1.8);
      scene.add(sun);
      kit.keep(texture);
      kit.keep(material);
    } else if (o.kind === 'journey') {
      for (let i = 0; i < count; i++) {
        const r = rider(i, 1, 1.5, null);
        r.group.position.set(i % 2 ? 1.7 : -1.7, (hash(i + 31) - 0.5) * 0.8 - 0.6, -i * 8);
        r.group.rotation.y = i % 2 ? -0.35 : 0.35;
        scene.add(r.group);
        riders.push(r);
      }
    } else {
      // horizon: one huge planet, the animals walking along its top, the other planets in the sky.
      if (o.planets[0]) {
        const made = kit.make(o.planets[0].image, BIG);
        loads.push(made.loaded);
        big = { body: made.body, glow: made.glow };
        made.body.position.set(0, -BIG, 0);
        // Its atmosphere, kept thin: a glowing rim along the horizon rather than a coloured sky.
        made.glow.position.set(0, -BIG, 0);
        made.glow.scale.setScalar(BIG * 0.9);
        (made.glow.material as Three.ShaderMaterial).uniforms.strength!.value = 0.45;
        scene.add(made.body, made.glow);
      }
      walkerGroup.position.set(0, -BIG, 0);
      scene.add(walkerGroup);
      o.animals.forEach((a, i) => {
        const mesh = animalMesh(a, 1.25, true);
        if (!mesh) return;
        walkerGroup.add(mesh);
        walkers.push({ mesh, base: i * SPACING, flies: Boolean(a.flies) });
      });
      skyGroup.position.set(0, -10, -26);
      scene.add(skyGroup);
      o.planets.slice(1).forEach((p, i) => {
        const size = 1 + hash(i + 41) * 1.6;
        const made = kit.make(p.image, size);
        loads.push(made.loaded);
        const group = new THREE.Group();
        group.add(made.body, made.glow);
        skyGroup.add(group);
        sky.push({ group, planet: made.body, base: (i / Math.max(1, o.planets.length - 1)) * Math.PI * 2 });
      });
    }
  }

  // ---------- Camera ----------
  let width = 0;
  let height = 0;
  const view = { x: 0, y: 0, toX: 0, toY: 0 };
  let progress = 0;
  function aim() {
    const sx = view.x * 0.6;
    const sy = view.y * 0.3;
    if (o.kind === 'worlds') {
      const d = worldsDistance;
      camera.position.set(sx * 2, d * 0.17 + sy * 2, d);
      camera.lookAt(0, 0.25, 0);
    } else if (o.kind === 'parade') {
      const d = 3.4 / Math.tan(((camera.fov / 2) * Math.PI) / 180) / Math.min(camera.aspect, 1.4);
      const e = 0.5 + sy * 0.3;
      camera.position.set(Math.sin(sx * 0.5) * d * Math.cos(e), Math.sin(e) * d, Math.cos(sx * 0.5) * d * Math.cos(e));
      camera.lookAt(0, 0.25, 0);
    } else if (o.kind === 'journey') {
      const end = (count - 1) * 8;
      const z = 6 - progress * (end + 3);
      // Drift toward the world being passed.
      const near = Math.min(count - 1, Math.max(0, Math.round((6 - z - 3) / 8)));
      const lean = (near % 2 ? 1 : -1) * 0.5;
      camera.position.set(lean + sx, 0.3 + sy, z);
      camera.lookAt(lean * 0.6 + sx * 0.5, 0, z - 8);
    } else {
      const narrow = camera.aspect < 1;
      camera.position.set(sx, 1.1 + sy, narrow ? 12 : 8.5);
      camera.lookAt(0, 1.45, 0);
    }
  }

  /** Worlds: back off until the whole ring, with its animals, fits the frame. */
  let worldsDistance = 10;
  function fitWorlds() {
    const R = Math.max(2.2, count * 0.62);
    const probe = new THREE.Vector3();
    let lo = 2;
    let hi = 60;
    for (let n = 0; n < 24; n++) {
      worldsDistance = (lo + hi) / 2;
      camera.position.set(0, worldsDistance * 0.17, worldsDistance);
      camera.lookAt(0, 0.25, 0);
      camera.updateMatrixWorld();
      let fits = true;
      for (let k = 0; k < 24 && fits; k++) {
        const a = (k / 24) * Math.PI * 2;
        for (const y of [-0.95, 1.9]) {
          probe.set(Math.sin(a) * (R + 0.7), y, Math.cos(a) * (R + 0.7)).project(camera);
          if (Math.abs(probe.x) > 0.95 || Math.abs(probe.y) > 0.9) fits = false;
        }
      }
      if (fits) hi = worldsDistance;
      else lo = worldsDistance;
    }
    worldsDistance = hi;
  }

  function resize(w: number, h: number) {
    if (!w || !h) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (o.kind === 'worlds') fitWorlds();
    aim();
    render();
  }

  // ---------- Pointer: hovering and dragging ----------
  const pointer = new THREE.Vector2(9, 9);
  const raycaster = new THREE.Raycaster();
  let hovered: Rider | null = null;
  let drag: { x: number; start: number } | null = null;
  let ringTurn = 0;
  let ringVelocity = 0;
  function pick() {
    if (!(o.kind === 'worlds' || o.kind === 'parade') || pointer.x > 2) {
      hovered = null;
      return;
    }
    raycaster.setFromCamera(pointer, camera);
    const meshes = riders.flatMap((r) => [r.planet, r.animal].filter(Boolean) as Three.Mesh[]);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    hovered = hit ? (riders.find((r) => r.planet === hit.object || r.animal === hit.object) ?? null) : null;
  }
  function label() {
    if (!o.onLabel) return;
    let r: Rider | null = null;
    if (o.kind === 'journey') {
      const z = 6 - progress * ((count - 1) * 8 + 3);
      const near = Math.round((6 - z - 3) / 8);
      r = near >= 0 && near < riders.length ? riders[near]! : null;
    } else r = hovered;
    if (!r || !r.name) return o.onLabel(null);
    const at = new THREE.Vector3();
    r.group.getWorldPosition(at);
    at.y -= r.radius * 1.25;
    at.project(camera);
    o.onLabel({ name: r.name, x: (at.x + 1) * 50, y: (1 - at.y) * 50 });
  }

  // ---------- Animation ----------
  let time = 0;
  let lastLabel = 0;
  function step(dt: number) {
    time += dt;
    const ease = Math.min(1, dt * 3);
    view.x += (view.toX - view.x) * ease;
    view.y += (view.toY - view.y) * ease;
    for (const r of riders) {
      if (r.planet) r.planet.rotation.y += dt * r.spin;
      r.lift += ((r === hovered ? 1 : 0) - r.lift) * Math.min(1, dt * 6);
      r.group.scale.setScalar(1 + r.lift * 0.18);
      if (r.animal) r.animal.rotation.y = Math.sin(time * 0.5 + r.spin * 9) * 0.18;
    }
    if (o.kind === 'worlds') {
      if (!drag) {
        ringVelocity += (0.12 - ringVelocity) * Math.min(1, dt * 0.8);
        if (!hovered) ringTurn += ringVelocity * dt;
      }
      ring.rotation.y = ringTurn;
      riders.forEach((r, i) => {
        // Face the viewer whatever the ring's turn, and bob.
        r.group.rotation.y = -ringTurn;
        r.group.position.y = Math.sin(time * 0.8 + i * 1.3) * 0.15 + (hash(i + 21) - 0.5) * 0.6;
      });
    } else if (o.kind === 'parade') {
      riders.forEach((r, i) => {
        const a = (i / count) * Math.PI * 2 + time * 0.12;
        const R = 2.3 + (i % 2) * 0.35;
        r.group.position.set(Math.cos(a) * R, Math.sin(time + i) * 0.05, Math.sin(a) * R);
        // Facing the way it crosses the view (turning round smoothly at the sides), angled a little along its orbit.
        const right = -Math.sin(a) >= 0;
        const target = (right ? 0 : Math.PI) - Math.cos(a) * 0.35 * (right ? 1 : -1);
        let turn = target - r.yaw;
        turn -= Math.round(turn / (Math.PI * 2)) * Math.PI * 2;
        r.yaw += turn * Math.min(1, dt * 2.5);
        r.group.rotation.y = r.yaw;
      });
      if (sun) sun.scale.setScalar(1.8 + Math.sin(time * 1.5) * 0.08);
    } else if (o.kind === 'journey') {
      riders.forEach((r, i) => (r.group.position.y = Math.sin(time * 0.7 + i) * 0.12 + (hash(i + 31) - 0.5) * 0.8 - 0.6));
    } else {
      const travel = time * 0.02 + progress * 0.5;
      if (big) big.body.rotation.z = -travel;
      // A gap wider than the view between the last walker and the first, so the wrap is never seen.
      const span = walkers.length * SPACING + 0.42;
      for (const w of walkers) {
        // Round and round: a walker leaving on the right comes back in on the left, out of sight.
        let a = (((w.base + travel) % span) + span) % span;
        a -= span / 2;
        const up = BIG - 0.04 + (w.flies ? 1.3 + Math.sin(time * 1.4) * 0.15 : 0);
        w.mesh.position.set(Math.sin(a) * up, Math.cos(a) * up, w.flies ? -0.6 : 0);
        w.mesh.rotation.set(0, 0, -a);
      }
      sky.forEach((s, i) => {
        const a = s.base + time * 0.03;
        s.group.position.set(Math.cos(a) * 22, Math.sin(a) * 9 + 4, -i * 1.5);
        s.planet.rotation.y += dt * 0.1;
      });
    }
    aim();
    if (time - lastLabel > 0.05) {
      lastLabel = time;
      pick();
      label();
    }
  }
  function render() {
    if (width && height) renderer.render(scene, camera);
  }

  const ready = Promise.all(loads.splice(0)).then(async () => {
    build();
    await Promise.all(loads);
    step(0);
    render();
  });

  return {
    ready,
    resize,
    frame(dt: number) {
      step(o.still ? 0 : dt);
      render();
    },
    /** Pointer over the canvas, −1…1 across and up; null when it leaves. */
    point(x: number | null, y = 0) {
      if (x === null) {
        pointer.set(9, 9);
        view.toX = view.toY = 0;
        hovered = null;
        o.onLabel?.(null);
        return;
      }
      pointer.set(x, y);
      view.toX = x;
      view.toY = y;
      if (drag) {
        const turn = (x - drag.x) * 2.2;
        ringVelocity = turn / 0.016;
        ringTurn = drag.start + turn;
      }
      if (o.still) {
        pick();
        label();
        render();
      }
    },
    /** Grab (worlds: drag the ring round) and let go. */
    grab(x: number | null) {
      if (o.kind !== 'worlds') return;
      drag = x === null ? null : { x, start: ringTurn };
      if (x === null) ringVelocity = Math.max(-2, Math.min(2, ringVelocity * 0.016));
    },
    /** How far through its section the page has scrolled, 0–1 (horizon and journey). */
    scroll(p: number) {
      progress = Math.min(1, Math.max(0, p));
      if (o.still) {
        step(0);
        render();
      }
    },
    still(on: boolean) {
      o.still = on;
      render();
    },
    dispose() {
      for (const m of sculptures) (m.userData.dispose as () => void)();
      kit.dispose();
      renderer.dispose();
    },
  };
}
