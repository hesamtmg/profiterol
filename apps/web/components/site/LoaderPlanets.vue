<script setup lang="ts">
/**
 * The "3D planets" page loader's scene: the planets (see lib/planet-kit) orbit the loading counter on a tilted ring
 * that draws itself as the page loads, each planet arriving in turn as the count passes its share. Once every planet
 * is in, `spinning` sends them round the orbit fast for a moment; then they turn slowly while the visitor reads the
 * name and the "enter" button. When the visitor goes in (`finishing`) the orbit speeds up and opens out past the
 * edges of the screen while the camera rises, so the planets fly off as the loader fades away. The planets are made
 * light (small pictures, half-size maps), so they are in quickly. Three.js is fetched only when this style is chosen;
 * until it is in, the
 * counter shows on its own, and each planet waits for its own picture. Emits `ready` once every planet has its
 * picture (or straight away when the browser can't draw WebGL), so the loader can hold the count until then.
 */
import type * as Three from 'three';
import { hash, onDarkBackground, planetKit } from '../../lib/planet-kit';

const props = defineProps<{ pictures: string[]; fill: number; percent: number; spinning?: boolean; finishing: boolean }>();
const emit = defineEmits<{ ready: [] }>();

const box = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const accentTone = ref<HTMLElement | null>(null);
const ready = ref(false);

/** How high the camera looks down on the orbit, in radians. */
const ELEVATION = 0.42;
const RADIUS = 1;
const PLANET = 0.12;

let dispose = () => {};

onMounted(async () => {
  let THREE: typeof Three;
  let renderer: Three.WebGLRenderer;
  try {
    THREE = await import('three');
    if (!canvas.value || !box.value) return;
    renderer = new THREE.WebGLRenderer({ canvas: canvas.value, alpha: true, antialias: true });
  } catch {
    emit('ready'); // No WebGL: the counter carries on alone.
    return;
  }
  const el = box.value;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);
  const accent = new THREE.Color(accentTone.value ? getComputedStyle(accentTone.value).color : '#ffffff');
  const kit = planetKit(THREE, renderer, { fill: props.fill, accent, dark: onDarkBackground(el), quality: 'light' });
  kit.light(scene);

  const system = new THREE.Group();
  scene.add(system);

  // The orbit, drawn as far round as the page has loaded.
  const SEGMENTS = 256;
  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: SEGMENTS + 1 }, (_, i) => {
      const a = -Math.PI / 2 + (i / SEGMENTS) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * RADIUS, 0, Math.sin(a) * RADIUS);
    }),
  );
  const orbitMaterial = new THREE.LineDashedMaterial({ color: accent, dashSize: 0.03, gapSize: 0.022, transparent: true, opacity: 0.85 });
  const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
  orbit.computeLineDistances();
  orbitGeometry.setDrawRange(0, 0);
  system.add(orbit);
  kit.keep(orbitGeometry);
  kit.keep(orbitMaterial);

  // Stars far behind.
  const stars = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    const u = hash(i + 301) * 2 - 1;
    const t = hash(i + 401) * Math.PI * 2;
    const s = Math.sqrt(1 - u * u) * 20;
    stars.set([Math.cos(t) * s, u * 20, Math.sin(t) * s], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(starGeometry, starMaterial));
  kit.keep(starGeometry);
  kit.keep(starMaterial);

  const pictures = props.pictures.slice(0, 8);
  const made = pictures.map((image, i) => {
    const size = PLANET * (0.8 + hash(i + 31) * 0.4);
    const { body, glow, loaded } = kit.make(image, size);
    const pivot = new THREE.Group();
    // Tip the axis back toward the camera, so the planet shows its equator, plus a little lean.
    pivot.rotation.set(-ELEVATION + (hash(i + 41) - 0.5) * 0.3, 0, (hash(i + 51) - 0.5) * 0.6);
    pivot.add(body);
    const holder = new THREE.Group();
    holder.add(pivot, glow);
    holder.scale.setScalar(0);
    system.add(holder);
    body.rotation.y = hash(i + 61) * Math.PI * 2;
    const planet = {
      holder,
      body,
      /** Its picture is on the globe, so it may arrive. */
      dressed: false,
      angle: -Math.PI / 2 + (i / pictures.length) * Math.PI * 2,
      /** The share of the count at which this planet arrives. */
      arrives: ((i + 0.5) / pictures.length) * 0.9,
      grown: 0,
      spin: 0.3 + hash(i + 71) * 0.4,
    };
    void loaded.then(() => (planet.dressed = true));
    return { planet, loaded };
  });
  const planets = made.map((m) => m.planet);

  let distance = 5;
  function aim(lift: number) {
    const e = ELEVATION + lift;
    camera.position.set(0, Math.sin(e) * distance, Math.cos(e) * distance);
    camera.lookAt(0, 0, 0);
  }
  /** Back the camera off until the orbit and its planets fill about two thirds of the smaller side of the screen. */
  function fit() {
    const probe = new THREE.Vector3();
    const reach = RADIUS + PLANET * 1.3;
    const fits = (d: number) => {
      distance = d;
      aim(0);
      camera.updateMatrixWorld();
      for (let k = 0; k < 32; k++) {
        const a = (k / 32) * Math.PI * 2;
        probe.set(Math.cos(a) * reach, PLANET, Math.sin(a) * reach).project(camera);
        if (Math.abs(probe.x) > 0.82 || Math.abs(probe.y) > 0.7) return false;
      }
      return true;
    };
    let lo = 1;
    let hi = 30;
    for (let n = 0; n < 24; n++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    distance = hi;
  }
  function resize() {
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fit();
  }
  const sized = new ResizeObserver(resize);
  sized.observe(el);
  resize();

  ready.value = true;
  void Promise.all(made.map((m) => m.loaded)).then(() => emit('ready'));

  let frame = 0;
  let last = 0;
  let orbitTime = 0;
  let shown = 0;
  let leaving = 0;
  let rush = 0;
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  /** Grows past full size and settles back. */
  const pop = (t: number) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
  function tick(now: number) {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    // The drawing follows the count smoothly rather than in its little steps.
    shown += (props.percent / 100 - shown) * (1 - Math.exp(-dt * 8));
    if (props.finishing) leaving = Math.min(1, leaving + dt / 1.4);
    const out = ease(leaving);
    // The spin once everything is in: the orbit races round, then settles to a slow turn.
    rush += ((props.spinning ? 1 : 0) - rush) * (1 - Math.exp(-dt * (props.spinning ? 6 : 2.5)));

    orbitTime += dt * (1 + rush * 14 + out * 5);
    orbitGeometry.setDrawRange(0, Math.ceil(Math.min(1, shown / 0.9) * SEGMENTS) + 1);
    for (const p of planets) {
      if (p.dressed && shown >= p.arrives) p.grown = Math.min(1, p.grown + dt / 0.7);
      const a = p.angle + orbitTime * 0.35;
      p.holder.position.set(Math.cos(a) * RADIUS, 0, Math.sin(a) * RADIUS);
      p.holder.scale.setScalar(p.grown ? pop(p.grown) : 0);
      p.body.rotateY(dt * p.spin * (1 + rush * 4));
    }
    // Leaving: the orbit opens out past the screen while the camera rises over it.
    system.scale.setScalar(1 + out * 2.6);
    orbitMaterial.opacity = 0.85 * (1 - out);
    aim(out * 0.6);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);

  dispose = () => {
    cancelAnimationFrame(frame);
    sized.disconnect();
    kit.dispose();
    renderer.dispose();
  };
});

onBeforeUnmount(() => dispose());
</script>

<template>
  <div ref="box" class="absolute inset-0 transition-opacity duration-700" :class="ready ? 'opacity-100' : 'opacity-0'" aria-hidden="true">
    <canvas ref="canvas" class="block h-full w-full" />
    <span ref="accentTone" class="hidden text-primary" />
  </div>
</template>
