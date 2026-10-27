<script setup lang="ts">
/**
 * Marks four corners on a photo (a `quad` field), e.g. where a print sits on a model's shirt. The corners are dragged
 * with a mouse or a finger and saved as fractions of the photo: "x1,y1,x2,y2,x3,y3,x4,y4" (top-left, top-right,
 * bottom-right, bottom-left). The grid inside shows how a picture will be bent onto it.
 */
import { parseQuad } from '@profiterol/blocks';

const props = defineProps<{ image: string }>();
const model = defineModel<string>({ default: '' });

type Point = [number, number];
const START: Point[] = [
  [0.3, 0.3],
  [0.7, 0.3],
  [0.7, 0.7],
  [0.3, 0.7],
];
const corners = ref<Point[]>(START);
const box = ref<HTMLElement | null>(null);
const dragging = ref<number | null>(null);
const ratio = ref(1);
watch(
  model,
  (v) => {
    if (dragging.value === null) corners.value = parseQuad(v ?? '') ?? START;
  },
  { immediate: true },
);

const save = () =>
  (model.value = corners.value
    .flat()
    .map((n) => +n.toFixed(4))
    .join(','));

function onDown(e: PointerEvent, i: number) {
  dragging.value = i;
  (e.target as Element).setPointerCapture(e.pointerId);
}

function onMove(e: PointerEvent) {
  if (dragging.value === null || !box.value) return;
  const r = box.value.getBoundingClientRect();
  const clamp = (v: number) => Math.min(1.2, Math.max(-0.2, v));
  const next = [...corners.value];
  next[dragging.value] = [clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height)];
  corners.value = next;
}

function onUp() {
  if (dragging.value === null) return;
  dragging.value = null;
  save();
}

function reset() {
  corners.value = START;
  save();
}

/** A point inside the quad, for the grid lines (u, v from 0 to 1). */
function at(u: number, v: number): Point {
  const [a, b, c, d] = corners.value;
  const top = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const bottom = [d[0] + (c[0] - d[0]) * u, d[1] + (c[1] - d[1]) * u];
  return [(top[0] + (bottom[0] - top[0]) * v) * 100, (top[1] + (bottom[1] - top[1]) * v) * ratio.value * 100];
}

const grid = computed(() => {
  const lines: string[] = [];
  for (const t of [0.25, 0.5, 0.75]) {
    lines.push(`M${at(t, 0).join(' ')}L${at(t, 1).join(' ')}`, `M${at(0, t).join(' ')}L${at(1, t).join(' ')}`);
  }
  return lines.join('');
});
const outline = computed(() => [at(0, 0), at(1, 0), at(1, 1), at(0, 1)].map((p) => p.join(' ')).join(' '));

function onLoad(e: Event) {
  const img = e.target as HTMLImageElement;
  ratio.value = img.naturalHeight / Math.max(1, img.naturalWidth);
}
</script>

<template>
  <div>
    <p v-if="!props.image" class="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500">
      {{ $t('Add the photo first.') }}
    </p>
    <template v-else>
      <div ref="box" class="relative touch-none select-none overflow-hidden rounded-xl bg-slate-100" dir="ltr">
        <img :src="props.image" alt="" class="block w-full" draggable="false" @load="onLoad" />
        <svg class="absolute inset-0 h-full w-full" :viewBox="`0 0 100 ${ratio * 100}`" preserveAspectRatio="none">
          <polygon :points="outline" fill="rgba(37,99,235,0.18)" stroke="#2563eb" stroke-width="0.5" vector-effect="non-scaling-stroke" />
          <path :d="grid" fill="none" stroke="#2563eb" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" />
        </svg>
        <button
          v-for="(p, i) in corners"
          :key="i"
          type="button"
          class="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-blue-600 bg-white shadow active:cursor-grabbing"
          :style="{ left: `${p[0] * 100}%`, top: `${p[1] * 100}%` }"
          :aria-label="$t('Corner {n}', { n: i + 1 })"
          :data-corner="i"
          @pointerdown.prevent="onDown($event, i)"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointercancel="onUp"
        />
      </div>
      <button type="button" class="btn-light mt-2 !px-3 !py-1 text-xs" @click="reset">
        <i class="mdi mdi-restore" /> {{ $t('Reset') }}
      </button>
    </template>
  </div>
</template>
