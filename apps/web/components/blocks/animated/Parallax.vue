<script setup lang="ts">
/**
 * Layers of pictures moving at different speeds as the visitor scrolls, and a little with the mouse.
 * The title sits behind the front layers, so hills (or a cut-out photo) can pass in front of it.
 * Layers without a picture are drawn as hills in the theme colors.
 */
import EditableText from '../../site/EditableText.vue';

interface Layer {
  image: string;
  speed: string;
  fit: string;
}

const props = defineProps<{
  p: { title: string; text: string; buttonLabel: string; buttonLink: string; layers: Layer[]; mouse: boolean; height: string };
  locale: string;
}>();

const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const root = ref<HTMLElement | null>(null);
const SPEED: Record<string, number> = { still: 0, slow: 0.2, medium: 0.45, fast: 0.8, reverse: -0.35 };

/** 0 as the section enters at the bottom of the screen, 1 as it leaves at the top. */
const progress = useScrollProgress(root, (r, vh) => (vh - r.top) / (vh + r.height), 0.5);
const height = ref(800);
const mouse = reactive({ x: 0, y: 0 });
const target = { x: 0, y: 0 };
let frame = 0;

function onPointer(e: PointerEvent) {
  if (!props.p.mouse || e.pointerType !== 'mouse' || !root.value) return;
  const r = root.value.getBoundingClientRect();
  target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  frame ||= requestAnimationFrame(ease);
}

/** Glide toward the mouse instead of jumping, which reads as weight. */
function ease() {
  mouse.x += (target.x - mouse.x) * 0.08;
  mouse.y += (target.y - mouse.y) * 0.08;
  frame = Math.abs(target.x - mouse.x) + Math.abs(target.y - mouse.y) > 0.001 ? requestAnimationFrame(ease) : 0;
}

function layerStyle(layer: Layer, i: number) {
  if (reduced.value) return {};
  const shift = (progress.value - 0.5) * height.value * 0.6 * (SPEED[layer.speed] ?? 0);
  const depth = (i + 1) * 10;
  return { transform: `translate3d(${mouse.x * depth}px, ${shift + mouse.y * depth * 0.5}px, 0)` };
}

const titleStyle = computed(() => {
  if (reduced.value) return {};
  const shift = (progress.value - 0.5) * height.value * 0.35;
  return {
    transform: `translate3d(${mouse.x * -6}px, ${shift}px, 0)`,
    opacity: editing ? 1 : Math.max(0, Math.min(1, 1.6 - progress.value * 1.6)),
  };
});

/** The title goes behind every layer after the first, so the front ones can pass in front of it. */
const backLayers = computed(() => (props.p.layers ?? []).slice(0, 1));
const frontLayers = computed(() => (props.p.layers ?? []).slice(1));

/** Hills for layers without a picture: a far range, rolling hills and a near ridge. */
const HILLS = [
  'M0 260 L120 180 L230 240 L380 120 L520 230 L640 150 L800 250 L940 140 L1080 220 L1200 160 L1200 400 L0 400 Z',
  'M0 300 C150 230 300 230 450 290 C600 350 750 220 900 250 C1050 280 1120 240 1200 260 L1200 400 L0 400 Z',
  'M0 340 C200 290 350 330 520 320 C700 310 860 270 1000 300 C1100 320 1160 330 1200 320 L1200 400 L0 400 Z',
];
const HILL_COLORS = ['color-mix(in srgb, var(--c-primary) 55%, var(--c-dark))', 'var(--c-secondary)', 'var(--c-dark)'];

let resize: ResizeObserver | undefined;
onMounted(() => {
  resize = new ResizeObserver(() => (height.value = root.value?.offsetHeight ?? 800));
  if (root.value) resize.observe(root.value);
});
onBeforeUnmount(() => {
  resize?.disconnect();
  cancelAnimationFrame(frame);
});
</script>

<template>
  <section
    ref="root"
    class="relative isolate w-full overflow-hidden text-white"
    :class="p.height === 'tall' ? 'h-[80dvh] min-h-[480px]' : 'h-[100dvh] min-h-[560px]'"
    style="
      background: linear-gradient(
        to bottom,
        color-mix(in srgb, var(--c-dark) 85%, var(--c-primary)),
        color-mix(in srgb, var(--c-primary) 70%, white)
      );
    "
    @pointermove="onPointer"
  >
    <template v-for="(group, g) in [backLayers, frontLayers]" :key="g">
      <div
        v-for="(layer, j) in group"
        :key="`${g}-${j}`"
        class="pointer-events-none absolute -inset-x-[4%] -bottom-[30%] -top-[30%] will-change-transform"
        :style="layerStyle(layer, g === 0 ? 0 : j + 1)"
        aria-hidden="true"
      >
        <img
          v-if="layer.image"
          :src="layer.image"
          alt=""
          class="absolute w-full"
          :class="layer.fit === 'bottom' ? 'bottom-[20%] h-auto max-h-[50%] object-contain object-bottom' : 'inset-0 h-full object-cover'"
        />
        <template v-else>
          <svg class="absolute bottom-[calc(20%-1px)] h-[34%] w-full" viewBox="0 0 1200 400" preserveAspectRatio="none">
            <path :d="HILLS[(g === 0 ? 0 : j + 1) % HILLS.length]" :fill="HILL_COLORS[(g === 0 ? 0 : j + 1) % HILL_COLORS.length]" />
          </svg>
          <!-- The hill's color continues below it, so moving layers never show a gap at the bottom -->
          <div
            class="absolute inset-x-0 bottom-0 h-[20%]"
            :style="{ background: HILL_COLORS[(g === 0 ? 0 : j + 1) % HILL_COLORS.length] }"
          />
        </template>
      </div>

      <!-- Title, between the back layer and the front ones -->
      <div v-if="g === 0" class="absolute inset-x-0 top-[22%] px-6 text-center will-change-transform" :style="titleStyle">
        <h2 class="text-5xl font-black uppercase leading-none tracking-tight drop-shadow-lg @3xl:text-8xl @5xl:text-9xl">
          <EditableText :value="p.title" path="title" placeholder="Title" />
        </h2>
        <p v-if="p.text || editing" class="mx-auto mt-5 max-w-xl text-lg font-light opacity-90 @3xl:text-xl">
          <EditableText :value="p.text" path="text" multiline />
        </p>
      </div>
    </template>

    <!-- The button stays in front of everything, so it can always be clicked -->
    <div v-if="p.buttonLabel" class="absolute inset-x-0 bottom-[12%] z-10 flex justify-center">
      <a
        :href="editing ? undefined : resolveHref(p.buttonLink, locale)"
        class="glass inline-flex items-center gap-2 rounded-[var(--radius-button)] px-7 py-3 text-sm font-semibold text-white transition hover:scale-105"
      >
        <EditableText :value="p.buttonLabel" path="buttonLabel" />
        <i class="mdi mdi-arrow-down" />
      </a>
    </div>
  </section>
</template>
