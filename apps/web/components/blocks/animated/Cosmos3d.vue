<script setup lang="ts">
/**
 * Animals and planets together in 3D (see lib/cosmos): tiny worlds on a ring, a march along a huge planet's
 * horizon, a parade round a sun, or a scroll-driven journey past the planets. The title, text and button are
 * ordinary editable text around the scene. Three.js is only downloaded by pages that use the block; in the editor
 * and for visitors who asked for less motion the scene holds still.
 */
import type { CosmosAnimal, CosmosKind, CosmosLabel, CosmosPlanet } from '../../../lib/cosmos';
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
const kind = computed<CosmosKind>(() =>
  ['worlds', 'horizon', 'parade', 'journey'].includes(props.p.scene) ? (props.p.scene as CosmosKind) : 'worlds',
);
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
const empty = computed(() => !planets.value.length && !animals.value.length);
/** Rebuild the scene when its pictures or kind change in the editor. */
const sceneKey = computed(() => JSON.stringify([kind.value, props.p.fill, planets.value, animals.value]));

const section = ref<HTMLElement | null>(null);
const label = ref<CosmosLabel | null>(null);
const ready = ref(false);
const journey = computed(() => kind.value === 'journey');
// Scrolling: through the tall journey section (0 at its top, 1 at its end), or past the horizon section.
const progress = useScrollProgress(section, (rect, vh) =>
  journey.value ? -rect.top / Math.max(1, rect.height - vh) : (vh - rect.top) / (vh + rect.height),
);

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
      planets: planets.value,
      animals: animals.value,
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
  const down = (e: PointerEvent) => {
    scene.grab(at(e)[0]);
    el.setPointerCapture(e.pointerId);
  };
  const up = (e: PointerEvent) => {
    scene.grab(null);
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
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
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
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

const hint = computed(() => (kind.value === 'worlds' ? (props.locale === 'fa' ? 'برای چرخاندن بکشید' : 'Drag to turn the worlds') : ''));
</script>

<template>
  <!-- The journey: a tall section whose scene stays on screen while the page scrolls through it -->
  <section v-if="journey" ref="section" class="relative bg-[#07070c] text-white" :class="editing ? 'h-[100dvh]' : 'h-[420vh]'">
    <div class="sticky top-0 h-[100dvh] overflow-hidden">
      <div
        ref="box"
        class="absolute inset-0 transition-opacity duration-1000"
        :class="ready ? 'opacity-100' : 'opacity-0'"
        aria-hidden="true"
      >
        <canvas ref="canvas" class="block h-full w-full" />
      </div>
      <div
        class="pointer-events-none absolute inset-x-0 top-0 px-6 pt-28 text-center transition-opacity duration-500"
        :class="{ 'opacity-0': !editing && progress > 0.08 }"
      >
        <p v-if="p.eyebrow || editing" class="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary @3xl:text-sm">
          <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
        </p>
        <h2 class="text-4xl font-black tracking-tight @3xl:text-6xl"><EditableText :value="p.title" path="title" /></h2>
        <p v-if="p.text || editing" class="mx-auto mt-4 max-w-xl text-lg font-light text-white/70">
          <EditableText :value="p.text" path="text" multiline />
        </p>
        <p v-if="!editing" class="mt-8 text-xs uppercase tracking-[0.3em] text-white/40">
          <i class="mdi mdi-chevron-double-down motion-safe:animate-bounce" /> {{ locale === 'fa' ? 'اسکرول کنید' : 'Scroll' }}
        </p>
      </div>
      <!-- The world being passed -->
      <Transition
        mode="out-in"
        enter-active-class="transition duration-500"
        enter-from-class="opacity-0 translate-y-3"
        leave-active-class="transition duration-300"
        leave-to-class="opacity-0"
      >
        <p
          v-if="label && progress > 0.08"
          :key="label.name"
          class="pointer-events-none absolute inset-x-0 bottom-24 text-center text-3xl font-black tracking-tight @3xl:text-5xl"
        >
          {{ label.name }}
        </p>
      </Transition>
      <div
        class="absolute inset-x-0 bottom-10 text-center transition-opacity duration-500"
        :class="editing || progress > 0.9 ? 'opacity-100' : 'pointer-events-none opacity-0'"
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
      <p v-if="editing && empty" class="absolute inset-0 flex items-center justify-center text-sm text-white/60">
        {{ $t('Add planets and animals') }}
      </p>
    </div>
  </section>

  <!-- Tiny worlds, the horizon and the parade: a heading, the scene, then the button -->
  <section v-else ref="section" class="overflow-hidden bg-[#07070c] px-4 py-20 text-white @3xl:py-28">
    <div class="mx-auto max-w-2xl text-center">
      <p v-if="p.eyebrow || editing" class="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary @3xl:text-sm">
        <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
      </p>
      <h2 class="text-3xl font-black tracking-tight @3xl:text-5xl"><EditableText :value="p.title" path="title" /></h2>
      <p v-if="p.text || editing" class="mt-4 text-lg font-light text-white/70"><EditableText :value="p.text" path="text" multiline /></p>
    </div>
    <div class="relative -mx-4 mt-6" :class="kind === 'horizon' ? 'h-[62vh] min-h-[380px]' : 'h-[72vh] min-h-[420px]'">
      <div
        ref="box"
        class="cosmos-fade absolute inset-0 touch-pan-y transition-opacity duration-1000"
        :class="[ready ? 'opacity-100' : 'opacity-0', kind === 'worlds' ? 'cursor-grab active:cursor-grabbing' : '']"
        aria-hidden="true"
      >
        <canvas ref="canvas" class="block h-full w-full" />
      </div>
      <span
        v-if="label"
        class="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur"
        :style="{ left: `${label.x}%`, top: `calc(${label.y}% + 0.5rem)` }"
      >
        {{ label.name }}
      </span>
      <ul class="sr-only">
        <li v-for="(a, i) in animals" :key="`a${i}`">{{ a.name }}</li>
        <li v-for="(pl, i) in planets" :key="`p${i}`">{{ pl.name }}</li>
      </ul>
      <p v-if="editing && empty" class="absolute inset-0 flex items-center justify-center text-sm text-white/60">
        {{ $t('Add planets and animals') }}
      </p>
    </div>
    <div class="mt-4 text-center">
      <p v-if="hint && !editing" class="mb-6 text-xs uppercase tracking-[0.25em] text-white/40">{{ hint }}</p>
      <a
        v-if="p.buttonLabel"
        :href="editing ? undefined : resolveHref(p.buttonLink, locale)"
        class="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
      >
        <EditableText :value="p.buttonLabel" path="buttonLabel" />
        <i class="mdi mdi-arrow-right rtl:rotate-180" />
      </a>
    </div>
  </section>
</template>

<style scoped>
/* The scene melts into the section at its top and bottom edges, so nothing ends in a hard line. */
.cosmos-fade {
  mask-image: linear-gradient(to bottom, transparent, black 10%, black 82%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 82%, transparent);
}
</style>
