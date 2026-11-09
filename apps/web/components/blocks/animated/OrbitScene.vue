<script setup lang="ts">
/**
 * The 3D look of the orbit block: each picture wrapped around a lit sphere that rocks gently on its axis while the two
 * dashed rings carry the spheres round in opposite directions, seen from straight above like the flat look. Moving
 * the pointer tilts the whole system a little; pointing at it stops the rings (the spheres keep rocking) and names
 * the sphere under the pointer. Three.js is only downloaded by pages that use this look. While `still` (the editor,
 * or a visitor who asked for less motion) one frame is drawn and nothing moves. Emits `ready` once the first frame
 * with its pictures is on screen, and `failed` when the browser can't draw WebGL, so the block can fall back.
 */
import type * as Three from 'three';

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

/** The view reaches a little past the block's square so spheres on the outer ring aren't cut off. */
const VIEW = 1.12;
const PLANET = 0.13;
const TILT = 0.2;
/** How far, in radians, each planet rocks either way on its axis. */
const SWAY = 0.5;

let dispose = () => {};

/**
 * A sphere whose texture coordinates read a round picture of a planet: the disc in the middle of the picture
 * (`fill` of its width) covers the half facing the viewer, so at rest the sphere looks like the picture, and the far
 * half shows it mirrored, so the sphere can spin all the way round without a seam. Longitude is spread evenly across
 * the disc rather than projected, so the rim isn't smeared as it turns to the front.
 */
function discSphere(THREE: typeof Three, radius: number, fill: number) {
  const geometry = new THREE.SphereGeometry(radius, 64, 40);
  const position = geometry.attributes.position!;
  const uv = geometry.attributes.uv!;
  const p = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i).normalize();
    const lat = Math.asin(Math.max(-1, Math.min(1, p.y)));
    let lon = Math.atan2(p.x, p.z);
    if (Math.abs(lon) > Math.PI / 2) lon = Math.sign(lon) * Math.PI - lon;
    const x = (lon / (Math.PI / 2)) * Math.cos(lat);
    uv.setXY(i, 0.5 + (x * fill) / 2, 0.5 + (p.y * fill) / 2);
  }
  uv.needsUpdate = true;
  return geometry;
}
let redraw = () => {};

/** The inner ring takes up to five, the outer the rest — as in the flat look. */
function split(items: Item[]) {
  const inner = Math.min(5, Math.ceil(items.length * 0.4));
  return [
    { items: items.slice(0, inner), radius: 0.56, direction: -1, speed: 1 },
    { items: items.slice(inner), radius: 0.94, direction: 1, speed: 1.4 },
  ].filter((r) => r.items.length);
}

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

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-VIEW, VIEW, VIEW, -VIEW, 0.1, 20);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(-2.5, 2.5, 3);
  scene.add(sun);

  const system = new THREE.Group();
  scene.add(system);

  const ringColor = new THREE.Color(ringTone.value ? getComputedStyle(ringTone.value).color : '#cbd5e1');
  const accent = new THREE.Color(accentTone.value ? getComputedStyle(accentTone.value).color : '#6366f1');
  const sphere = discSphere(THREE, PLANET, Math.min(Math.max(Number(props.fill) || 100, 10), 100) / 100);
  const disposables: { dispose(): void }[] = [sphere];
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const loads: Promise<unknown>[] = [];

  function material(item: Item) {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, color: item.image ? 0xffffff : accent });
    disposables.push(m);
    if (item.image) {
      loads.push(
        loader
          .loadAsync(item.image)
          .then((texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
            m.map = texture;
            m.needsUpdate = true;
            disposables.push(texture);
          })
          .catch(() => m.color.copy(accent)),
      );
    }
    return m;
  }

  interface Ring {
    group: Three.Group;
    direction: number;
    speed: number;
  }
  const rings: Ring[] = [];
  const planets: { mesh: Three.Mesh; spin: number; phase: number; name: string }[] = [];

  split(props.items ?? []).forEach((ring, r) => {
    const group = new THREE.Group();
    system.add(group);

    const points = Array.from({ length: 257 }, (_, i) => {
      const a = (i / 256) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * ring.radius, Math.sin(a) * ring.radius, 0);
    });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineDashedMaterial({
      color: ringColor,
      dashSize: 0.025,
      gapSize: 0.018,
      transparent: true,
      opacity: 0.9,
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.computeLineDistances();
    group.add(line);
    disposables.push(lineGeometry, lineMaterial);

    ring.items.forEach((item, i) => {
      // Evenly spaced, starting at the top and going clockwise, like the flat look.
      const a = Math.PI / 2 - (i / ring.items.length) * Math.PI * 2;
      const pivot = new THREE.Group();
      pivot.position.set(Math.cos(a) * ring.radius, Math.sin(a) * ring.radius, 0);
      pivot.rotation.set(0.12, 0, ((i * 0.61) % 0.6) - 0.3);
      const mesh = new THREE.Mesh(sphere, material(item));
      mesh.rotation.y = SWAY * Math.sin(i * 1.7 + r);
      pivot.add(mesh);
      group.add(pivot);
      planets.push({ mesh, spin: 0.35 + ((i * 0.17 + r * 0.11) % 0.3), phase: i * 1.7 + r, name: item.name });
    });
    rings.push({ group, direction: ring.direction, speed: ring.speed });
  });

  function resize() {
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.left = -VIEW * Math.max(aspect, 1);
    camera.right = VIEW * Math.max(aspect, 1);
    camera.top = VIEW / Math.min(aspect, 1);
    camera.bottom = -VIEW / Math.min(aspect, 1);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  redraw = () => renderer.render(scene, camera);

  // Pointer: tilt toward it, stop the rings while it's over the system, name the sphere under it.
  const pointer = new THREE.Vector2();
  const tilt = { x: 0, y: 0, toX: 0, toY: 0 };
  const raycaster = new THREE.Raycaster();
  let hovering = false;
  function pick() {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(
      planets.map((p) => p.mesh),
      false,
    )[0];
    const planet = hit && planets.find((p) => p.mesh === hit.object);
    if (!planet?.name) return (label.value = null);
    const at = new THREE.Vector3();
    planet.mesh.getWorldPosition(at).project(camera);
    label.value = { name: planet.name, x: (at.x + 1) * 50, y: (1 - at.y) * 50 };
  }
  function move(e: PointerEvent) {
    const rect = el.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    hovering = e.pointerType === 'mouse';
    tilt.toX = -pointer.y * TILT;
    tilt.toY = pointer.x * TILT;
    pick();
    if (props.still) redraw();
  }
  function leave() {
    hovering = false;
    tilt.toX = tilt.toY = 0;
    label.value = null;
  }
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);

  // The clock only runs while the system is on screen and allowed to move.
  let visible = true;
  let frame = 0;
  let last = 0;
  let orbitTime = 0;
  let spinTime = 0;
  const seconds = () => Math.max(Number(props.seconds) || 40, 5);
  function tick(now: number) {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    if (!hovering) orbitTime += dt;
    for (const ring of rings) ring.group.rotation.z = ring.direction * ((orbitTime * Math.PI * 2) / (seconds() * ring.speed));
    // Each planet rocks on its axis rather than turning right round, so its picture always faces the viewer.
    spinTime += dt;
    for (const p of planets) p.mesh.rotation.y = SWAY * Math.sin(spinTime * p.spin + p.phase);
    const ease = 1 - Math.exp(-dt * 5);
    tilt.x += (tilt.toX - tilt.x) * ease;
    tilt.y += (tilt.toY - tilt.y) * ease;
    system.rotation.set(tilt.x, tilt.y, 0);
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
        system.rotation.set(0, 0, 0);
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
  resize();

  dispose = () => {
    stop();
    stopWatching();
    seen.disconnect();
    sized.disconnect();
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
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
watch(
  () => props.items,
  () => redraw(),
  { deep: true },
);
</script>

<template>
  <div ref="box" class="absolute inset-[-6%] transition-opacity duration-700" :class="ready ? 'opacity-100' : 'opacity-0'">
    <canvas ref="canvas" class="block h-full w-full" aria-hidden="true" />
    <span ref="ringTone" class="hidden text-slate-300" />
    <span ref="accentTone" class="hidden text-primary" />
    <ul class="sr-only">
      <li v-for="(item, i) in items" :key="i">{{ item.name }}</li>
    </ul>
    <span
      v-if="label"
      class="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/75 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur"
      :style="{ left: `${label.x}%`, top: `calc(${label.y}% + 2.75rem)` }"
    >
      {{ label.name }}
    </span>
  </div>
</template>
