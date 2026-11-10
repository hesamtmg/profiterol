<script setup lang="ts">
/**
 * A scroll journey in 3D (see lib/cosmos): down a jungle path past the animals, or into a galaxy past the planets.
 * The section is tall and its scene stays on screen while the page scrolls through it; the name of each animal or
 * planet shows as the camera stops by it, and the button appears at the end. Three.js is only downloaded by pages
 * that use the block, and the scene is built when the visitor gets near it. In the editor and for visitors who asked
 * for less motion the scene holds still (scrolling still moves the camera).
 */
import type { CosmosAnimal, CosmosKind, CosmosPlanet } from '../../../lib/cosmos';
import EditableText from '../../site/EditableText.vue';

const props = defineProps<{
  p: {
    eyebrow: string;
    title: string;
    text: string;
    buttonLabel: string;
    buttonLink: string;
    scene: string;
    planets: { image: string; name: string }[];
    animals: { image: string; name: string; size?: number; faces?: string; flies?: boolean }[];
    fill: number;
  };
  locale: string;
}>();

const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const still = computed(() => editing || reduced.value);
const kind = computed<CosmosKind>(() => (props.p.scene === 'galaxy' ? 'galaxy' : 'jungle'));
const galaxy = computed(() => kind.value === 'galaxy');
const planets = computed<CosmosPlanet[]>(() =>
  (props.p.planets ?? []).filter((x) => x?.image).map((x) => ({ image: x.image, name: x.name ?? '' })),
);
const animals = computed<CosmosAnimal[]>(() =>
  (props.p.animals ?? [])
    .filter((x) => x?.image)
    .map((x) => ({
      image: x.image,
      name: x.name ?? '',
      size: Number(x.size) || 1,
      faces: x.faces === 'left' ? 'left' : 'right',
      flies: Boolean(x.flies),
    })),
);
const empty = computed(() => (galaxy.value ? !planets.value.length : !animals.value.length));
/** Rebuild the scene when its pictures or kind change in the editor. */
const sceneKey = computed(() => JSON.stringify([kind.value, props.p.fill, planets.value, animals.value]));

const section = ref<HTMLElement | null>(null);
const label = ref<string | null>(null);
const ready = ref(false);
// How far the page has scrolled through the tall section: 0 at its top, 1 at its end.
const progress = useScrollProgress(section, (rect, vh) => -rect.top / Math.max(1, rect.height - vh));
/** Taller with more stops, so each one gets its share of scrolling. */
const stops = computed(() => (galaxy.value ? planets.value.length : animals.value.length));

const box = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
let teardown = () => {};

async function start() {
  teardown();
  ready.value = false;
  label.value = null;
  if (empty.value || !canvas.value || !box.value) return;
  let scene: ReturnType<typeof import('../../../lib/cosmos').cosmosScene>;
  try {
    const [THREE, { cosmosScene }] = await Promise.all([import('three'), import('../../../lib/cosmos')]);
    if (!canvas.value || !box.value) return;
    scene = cosmosScene(THREE, canvas.value, {
      kind: kind.value,
      planets: galaxy.value ? planets.value : [],
      animals: galaxy.value ? [] : animals.value,
      fill: Math.min(100, Math.max(10, Number(props.p.fill) || 100)) / 100,
      still: still.value,
      onLabel: (l) => (label.value = l),
    });
  } catch {
    return; // No WebGL: the text shows on its own.
  }
  const el = box.value;
  const sized = new ResizeObserver(() => {
    const r = el.getBoundingClientRect();
    scene.resize(r.width, r.height);
  });
  sized.observe(el);
  await scene.ready;
  scene.scroll(progress.value);
  ready.value = true;

  let visible = true;
  let frame = 0;
  let last = 0;
  const tick = (now: number) => {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    scene.frame(dt);
    run();
  };
  const run = () => {
    if (!frame && visible && !still.value) frame = requestAnimationFrame(tick);
  };
  const halt = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  };
  const seen = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    if (visible) run();
    else halt();
  });
  seen.observe(el);
  const stopScroll = watch(progress, (v) => scene.scroll(v));
  const stopStill = watch(still, (s) => {
    scene.still(s);
    if (s) halt();
    else run();
  });

  const at = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1] as const;
  };
  const move = (e: PointerEvent) => scene.point(...at(e));
  const leave = () => scene.point(null);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  scene.frame(0);
  run();

  teardown = () => {
    halt();
    sized.disconnect();
    seen.disconnect();
    stopScroll();
    stopStill();
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
    scene.dispose();
    teardown = () => {};
  };
}

// Build the scene only when the visitor gets near it: making the planets and animals takes a moment of work.
let near = false;
let approach: IntersectionObserver | null = null;
onMounted(() => {
  if (!section.value) return;
  approach = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting || near) return;
      near = true;
      approach?.disconnect();
      start();
    },
    { rootMargin: '400px 0px' },
  );
  approach.observe(section.value);
});
watch(sceneKey, () => near && nextTick(start));
onBeforeUnmount(() => {
  approach?.disconnect();
  teardown();
});
</script>

<template>
  <!-- A tall section whose scene stays on screen while the page scrolls through it -->
  <section
    ref="section"
    class="relative text-white"
    :class="galaxy ? 'bg-[#05040b]' : 'bg-[#0d2418]'"
    :style="{ height: editing ? '100dvh' : `${Math.max(3, stops + 2) * 70}vh` }"
  >
    <div class="sticky top-0 h-[100dvh] overflow-hidden">
      <div
        ref="box"
        class="absolute inset-0 transition-opacity duration-1000"
        :class="ready ? 'opacity-100' : 'opacity-0'"
        aria-hidden="true"
      >
        <canvas ref="canvas" class="block h-full w-full" />
      </div>
      <!-- Shade at the top and bottom, so the text reads over any scene -->
      <div class="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/50 to-transparent" aria-hidden="true" />
      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />
      <div
        class="pointer-events-none absolute inset-x-0 top-0 px-6 pt-28 text-center transition-opacity duration-500"
        :class="{ 'opacity-0': !editing && progress > 0.06 }"
      >
        <p v-if="p.eyebrow || editing" class="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary @3xl:text-sm">
          <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
        </p>
        <h2 class="text-4xl font-black tracking-tight drop-shadow-lg @3xl:text-6xl"><EditableText :value="p.title" path="title" /></h2>
        <p v-if="p.text || editing" class="mx-auto mt-4 max-w-xl text-lg font-light text-white/80">
          <EditableText :value="p.text" path="text" multiline />
        </p>
        <p v-if="!editing" class="mt-8 text-xs uppercase tracking-[0.3em] text-white/50">
          <i class="mdi mdi-chevron-double-down motion-safe:animate-bounce" /> {{ locale === 'fa' ? 'اسکرول کنید' : 'Scroll' }}
        </p>
      </div>
      <!-- The animal or planet being visited -->
      <Transition
        mode="out-in"
        enter-active-class="transition duration-500"
        enter-from-class="opacity-0 translate-y-3"
        leave-active-class="transition duration-300"
        leave-to-class="opacity-0"
      >
        <p
          v-if="label"
          :key="label"
          class="pointer-events-none absolute inset-x-0 bottom-24 text-center text-3xl font-black tracking-tight drop-shadow-lg @3xl:text-5xl"
        >
          {{ label }}
        </p>
      </Transition>
      <div
        class="absolute inset-x-0 bottom-10 text-center transition-opacity duration-500"
        :class="editing || progress > 0.93 ? 'opacity-100' : 'pointer-events-none opacity-0'"
      >
        <a
          v-if="p.buttonLabel"
          :href="editing ? undefined : resolveHref(p.buttonLink, locale)"
          class="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
        >
          <EditableText :value="p.buttonLabel" path="buttonLabel" />
          <i class="mdi mdi-arrow-right rtl:rotate-180" />
        </a>
      </div>
      <ul class="sr-only">
        <li v-for="(a, i) in galaxy ? planets : animals" :key="i">{{ a.name }}</li>
      </ul>
      <p v-if="editing && empty" class="absolute inset-0 flex items-center justify-center text-sm text-white/60">
        {{ galaxy ? $t('Add planets') : $t('Add animals') }}
      </p>
    </div>
  </section>
</template>
