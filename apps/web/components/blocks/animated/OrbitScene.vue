<script setup lang="ts">
/**
 * The 3D look of the orbit block: a small solar system seen in perspective from above and in front. Each picture
 * becomes a globe (see lib/planet-globe) with a little relief and a glowing atmosphere, spinning on its own tilted
 * axis while the two dashed orbits carry the planets round in opposite directions; on a dark background a few stars
 * drift behind. Each planet can be grabbed and turned by hand, and keeps turning for a moment when let go. Moving
 * the pointer swings the camera a little; pointing at the system stops the orbits (the planets keep spinning) and
 * names the planet under the pointer. Three.js is only downloaded by pages that use this look.
 * While `still` (the editor, or a visitor who asked for less motion) one frame is drawn and nothing moves. Emits
 * `ready` once the first frame with its pictures is on screen, and `failed` when the browser can't draw WebGL.
 */
import type * as Three from 'three';
import { planetSurface } from '../../../lib/planet-globe';

interface Item {
  image: string;
  icon: string;
  name: string;
}

const props = defineProps<{ items: Item[]; seconds: number; still: boolean; fill?: number }>();
const emit = defineEmits<{ ready: []; failed: [] }>();

const box = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const ringTone = ref<HTMLElement | null>(null);
const accentTone = ref<HTMLElement | null>(null);
const ready = ref(false);
const label = ref<{ name: string; x: number; y: number } | null>(null);

/** How high the camera looks down on the orbits, in radians (0 = edge on, π/2 = straight down). */
const ELEVATION = 0.85;
const FOV = 32;
/** How far the pointer swings the camera: round the system, and up and down. */
const SWING = { azimuth: 0.35, elevation: 0.12 };

let dispose = () => {};
let redraw = () => {};

/** The inner orbit takes up to five planets, the outer the rest — as in the flat look. */
function split(items: Item[]) {
  const inner = Math.min(5, Math.ceil(items.length * 0.4));
  return [
    { items: items.slice(0, inner), radius: 0.56, direction: 1, speed: 1 },
    { items: items.slice(inner), radius: 0.94, direction: -1, speed: 1.4 },
  ].filter((r) => r.items.length);
}

/** A steady pseudo-random number in 0…1 for planet `i` of orbit `r`, so sizes and tilts don't change on reload. */
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** True when the nearest painted background behind `el` is dark. */
function onDark(el: HTMLElement) {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const m = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
    if (!m || (m[3] !== undefined && Number(m[3]) < 0.5)) continue;
    const [r, g, b] = m.map(Number) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
  }
  return false;
}

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 world = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-world.xyz);
    gl_Position = projectionMatrix * world;
  }
`;
const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 glow;
  uniform float strength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // Seen from outside, the shell's inner faces run from the planet's edge (facing the viewer about halfway) to the
    // shell's own edge (side on): brightest against the planet, fading to nothing at the edge.
    float hug = clamp(abs(dot(vNormal, vView)) / 0.5, 0.0, 1.0);
    gl_FragColor = vec4(glow, hug * hug * strength);
  }
`;

onMounted(async () => {
  let THREE: typeof Three;
  let renderer: Three.WebGLRenderer;
  try {
    THREE = await import('three');
    if (!canvas.value || !box.value) return;
    renderer = new THREE.WebGLRenderer({ canvas: canvas.value, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    emit('failed');
    return;
  }
  const el = box.value;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const dark = onDark(el);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
  let distance = 4;

  // Real shading, so each planet reads as a ball: a strong light from the upper left gives every planet a lit side,
  // a soft shadow side and a glossy highlight; a warm light in the middle of the system, like a sun, catches the
  // sides facing it; and only a little fill, so the shadow sides stay dark without going black.
  scene.add(new THREE.HemisphereLight(0xdde4ff, 0x10101a, dark ? 0.35 : 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(-2.5, 3, 2.2);
  scene.add(key);
  const sun = new THREE.PointLight(0xffd9a0, 2.2, 0, 0);
  scene.add(sun);

  const ringColor = new THREE.Color(ringTone.value ? getComputedStyle(ringTone.value).color : '#cbd5e1');
  const accent = new THREE.Color(accentTone.value ? getComputedStyle(accentTone.value).color : '#6366f1');
  const fill = Math.min(Math.max(Number(props.fill) || 100, 10), 100) / 100;
  const sphere = new THREE.SphereGeometry(1, 96, 64);
  const halo = new THREE.SphereGeometry(1.16, 48, 32);
  const disposables: { dispose(): void }[] = [sphere, halo];
  const loader = new THREE.ImageLoader();
  loader.setCrossOrigin('anonymous');
  const loads: Promise<unknown>[] = [];

  interface Planet {
    holder: Three.Group;
    body: Three.Mesh;
    glow: Three.Mesh;
    angle: number;
    radius: number;
    direction: number;
    speed: number;
    spin: number;
    /** Extra turn from being dragged, in radians per second round the camera's up and right axes; it dies away. */
    fling: Three.Vector2;
    name: string;
  }
  const planets: Planet[] = [];

  function makePlanet(item: Item, size: number) {
    const material = new THREE.MeshPhysicalMaterial({
      roughness: 0.62,
      metalness: 0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
      color: item.image ? 0xffffff : accent,
    });
    const glowMaterial = new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_VERTEX,
      fragmentShader: ATMOSPHERE_FRAGMENT,
      uniforms: { glow: { value: accent.clone() }, strength: { value: 0.9 } },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    disposables.push(material, glowMaterial);
    if (item.image) {
      loads.push(
        loader
          .loadAsync(item.image)
          .then((image) => {
            const surface = planetSurface(image, fill);
            const texture = new THREE.CanvasTexture(surface.canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            material.map = texture;
            // The picture's own light and dark doubles as a height map, for a little relief.
            material.bumpMap = texture;
            material.bumpScale = 2.5;
            material.needsUpdate = true;
            glowMaterial.uniforms.glow!.value.setRGB(...surface.color, THREE.SRGBColorSpace).multiplyScalar(1.6);
            disposables.push(texture);
          })
          .catch(() => material.color.copy(accent)),
      );
    }
    const body = new THREE.Mesh(sphere, material);
    const glow = new THREE.Mesh(halo, glowMaterial);
    body.scale.setScalar(size);
    glow.scale.setScalar(size);
    return { body, glow };
  }

  const PLANET = 0.13;
  let reach = 0;
  split(props.items ?? []).forEach((ring, r) => {
    const points = Array.from({ length: 257 }, (_, i) => {
      const a = (i / 256) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * ring.radius, 0, Math.sin(a) * ring.radius);
    });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineDashedMaterial({
      color: ringColor,
      dashSize: 0.025,
      gapSize: 0.02,
      transparent: true,
      opacity: 0.8,
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.computeLineDistances();
    scene.add(line);
    disposables.push(lineGeometry, lineMaterial);

    ring.items.forEach((item, i) => {
      const seed = r * 10 + i + 1;
      const size = PLANET * (0.85 + hash(seed) * 0.35);
      reach = Math.max(reach, ring.radius + size * 1.2);
      const { body, glow } = makePlanet(item, size);
      // Tip each planet's axis back toward the camera, so it shows its equator rather than a pole, plus a little lean.
      const pivot = new THREE.Group();
      pivot.rotation.set(-ELEVATION + (hash(seed + 7) - 0.5) * 0.3, 0, (hash(seed + 3) - 0.5) * 0.6);
      pivot.add(body);
      const holder = new THREE.Group();
      // The atmosphere glows by adding light, so it only shows (and is only drawn) on a dark background.
      holder.add(pivot);
      if (dark) holder.add(glow);
      scene.add(holder);
      body.rotation.y = hash(seed + 5) * Math.PI * 2;
      planets.push({
        holder,
        body,
        glow,
        angle: -Math.PI / 2 + (i / ring.items.length) * Math.PI * 2,
        radius: ring.radius,
        direction: ring.direction,
        speed: ring.speed,
        spin: 0.25 + hash(seed + 11) * 0.3,
        fling: new THREE.Vector2(),
        name: item.name,
      });
    });
  });

  // A few stars far behind, only where they'll show.
  if (dark) {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = hash(i + 101) * 2 - 1;
      const t = hash(i + 202) * Math.PI * 2;
      const s = Math.sqrt(1 - u * u) * 14;
      positions.set([Math.cos(t) * s, u * 14, Math.sin(t) * s], i * 3);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.55 });
    scene.add(new THREE.Points(starGeometry, starMaterial));
    disposables.push(starGeometry, starMaterial);
  }

  function place(time: number) {
    for (const p of planets) {
      const a = p.angle + p.direction * ((time * Math.PI * 2) / (seconds() * p.speed));
      p.holder.position.set(Math.cos(a) * p.radius, 0, Math.sin(a) * p.radius);
    }
  }

  const view = { azimuth: 0, elevation: ELEVATION, toAzimuth: 0, toElevation: ELEVATION };
  function aim() {
    const e = view.elevation;
    camera.position.set(
      Math.sin(view.azimuth) * Math.cos(e) * distance,
      Math.sin(e) * distance,
      Math.cos(view.azimuth) * Math.cos(e) * distance,
    );
    camera.lookAt(0, -0.04, 0);
  }

  /** Back the camera off until every orbit, with its planets, fits inside the frame. */
  function fit() {
    const probe = new THREE.Vector3();
    const fits = (d: number) => {
      distance = d;
      aim();
      camera.updateMatrixWorld();
      for (let k = 0; k < 48; k++) {
        const a = (k / 48) * Math.PI * 2;
        for (const y of [-PLANET * 1.3, PLANET * 1.3]) {
          probe.set(Math.cos(a) * reach, y, Math.sin(a) * reach).project(camera);
          if (Math.abs(probe.x) > 0.97 || Math.abs(probe.y) > 0.97) return false;
        }
      }
      return true;
    };
    let lo = 1;
    let hi = 20;
    for (let n = 0; n < 24; n++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    distance = hi;
    aim();
  }

  function resize() {
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const azimuth = view.azimuth;
    const elevation = view.elevation;
    view.azimuth = 0;
    view.elevation = ELEVATION;
    fit();
    view.azimuth = azimuth;
    view.elevation = elevation;
    aim();
    renderer.render(scene, camera);
  }
  redraw = () => renderer.render(scene, camera);

  // Pointer: swing the camera toward it, stop the orbits while it's over the system, name the planet under it.
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let hovering = false;
  let grabbed: { planet: Planet; x: number; y: number; time: number } | null = null;
  function planetAt() {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(
      planets.map((p) => p.body),
      false,
    )[0];
    return hit && planets.find((p) => p.body === hit.object);
  }
  function pick() {
    const planet = grabbed?.planet ?? planetAt();
    el.style.cursor = grabbed ? 'grabbing' : planet ? 'grab' : '';
    if (!planet?.name) return (label.value = null);
    const at = planet.holder.position.clone();
    at.y -= planet.glow.scale.x * 1.25;
    at.project(camera);
    label.value = { name: planet.name, x: (at.x + 1) * 50, y: (1 - at.y) * 50 };
  }
  /** Turn a planet's globe round an axis given in world space (its parents are tilted, so convert first). */
  const turnAxis = new THREE.Vector3();
  const parentTurn = new THREE.Quaternion();
  const turn = new THREE.Quaternion();
  function spinBy(planet: Planet, axis: Three.Vector3, angle: number) {
    planet.body.parent!.getWorldQuaternion(parentTurn).invert();
    turnAxis.copy(axis).applyQuaternion(parentTurn).normalize();
    planet.body.quaternion.premultiply(turn.setFromAxisAngle(turnAxis, angle));
  }
  const up = new THREE.Vector3();
  const right = new THREE.Vector3();
  function spinFromScreen(planet: Planet, dx: number, dy: number) {
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    spinBy(planet, up, dx);
    spinBy(planet, right, dy);
  }

  // Grab a planet to turn it by hand; let go and it keeps turning for a moment.
  function down(e: PointerEvent) {
    move(e);
    const planet = planetAt();
    if (!planet) return;
    grabbed = { planet, x: e.clientX, y: e.clientY, time: performance.now() };
    planet.fling.set(0, 0);
    el.setPointerCapture(e.pointerId);
    pick();
  }
  function release(e: PointerEvent) {
    if (!grabbed) return;
    grabbed = null;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    pick();
    start();
  }
  function move(e: PointerEvent) {
    const rect = el.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    hovering = e.pointerType === 'mouse' || Boolean(grabbed);
    if (grabbed) {
      // A drag across the planet's width turns it about half way round.
      const perPixel = 3 / Math.max(rect.width * grabbed.planet.body.scale.x, 1);
      const dx = (e.clientX - grabbed.x) * perPixel;
      const dy = (e.clientY - grabbed.y) * perPixel;
      const now = performance.now();
      const dt = Math.max((now - grabbed.time) / 1000, 1 / 120);
      spinFromScreen(grabbed.planet, dx, dy);
      grabbed.planet.fling.set(dx / dt, dy / dt).clampLength(0, 12);
      Object.assign(grabbed, { x: e.clientX, y: e.clientY, time: now });
      if (props.still) redraw();
    }
    view.toAzimuth = pointer.x * SWING.azimuth;
    view.toElevation = ELEVATION + pointer.y * SWING.elevation;
    pick();
    if (props.still) redraw();
  }
  function leave() {
    if (grabbed) return;
    hovering = false;
    view.toAzimuth = 0;
    view.toElevation = ELEVATION;
    label.value = null;
  }
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);

  // The clock only runs while the system is on screen and allowed to move.
  let visible = true;
  let frame = 0;
  let last = 0;
  let orbitTime = 0;
  const seconds = () => Math.max(Number(props.seconds) || 40, 5);
  function tick(now: number) {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    if (!hovering) orbitTime += dt;
    place(orbitTime);
    for (const p of planets) {
      if (p !== grabbed?.planet) {
        p.body.rotateY(dt * p.spin);
        if (p.fling.lengthSq() > 1e-4) {
          spinFromScreen(p, p.fling.x * dt, p.fling.y * dt);
          p.fling.multiplyScalar(Math.exp(-dt * 2.5));
        }
      }
    }
    const ease = 1 - Math.exp(-dt * 4);
    view.azimuth += (view.toAzimuth - view.azimuth) * ease;
    view.elevation += (view.toElevation - view.elevation) * ease;
    aim();
    if (hovering) pick();
    renderer.render(scene, camera);
    start();
  }
  function start() {
    if (!frame && visible && !props.still && ready.value) frame = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }
  const stopWatching = watch(
    () => props.still,
    (still) => {
      if (still) {
        stop();
        view.azimuth = view.toAzimuth = 0;
        view.elevation = view.toElevation = ELEVATION;
        aim();
        redraw();
      } else start();
    },
  );
  const seen = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    if (visible) start();
    else stop();
  });
  seen.observe(el);
  const sized = new ResizeObserver(resize);
  sized.observe(el);
  place(0);
  resize();

  dispose = () => {
    stop();
    stopWatching();
    seen.disconnect();
    sized.disconnect();
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointerup', release);
    el.removeEventListener('pointercancel', release);
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
  };

  await Promise.all(loads);
  if (!canvas.value) return;
  resize();
  ready.value = true;
  emit('ready');
  start();
});

onBeforeUnmount(() => dispose());
</script>

<template>
  <div ref="box" class="absolute inset-[-6%] touch-pan-y transition-opacity duration-700" :class="ready ? 'opacity-100' : 'opacity-0'">
    <canvas ref="canvas" class="block h-full w-full" aria-hidden="true" />
    <span ref="ringTone" class="hidden text-slate-300" />
    <span ref="accentTone" class="hidden text-primary" />
    <ul class="sr-only">
      <li v-for="(item, i) in items" :key="i">{{ item.name }}</li>
    </ul>
    <span
      v-if="label"
      class="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/75 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur"
      :style="{ left: `${label.x}%`, top: `calc(${label.y}% + 0.5rem)` }"
    >
      {{ label.name }}
    </span>
  </div>
</template>
