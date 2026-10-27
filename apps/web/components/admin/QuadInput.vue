<script setup lang="ts">
/**
 * Marks where a print sits on a photo (a `quad` field): a grid of points, 2×2 (four corners) up to 6×6, so the print
 * can follow a curved body or folds. Points are dragged with a mouse or a finger; dragging inside the grid moves it
 * all. Changing the number of points keeps the shape already marked. Saved as fractions of the photo (see parseMesh).
 */
import { formatMesh, MESH_MAX, MESH_MIN, parseMesh, type Mesh } from '@profiterol/blocks';

const props = defineProps<{ image: string }>();
const model = defineModel<string>({ default: '' });

type Point = [number, number];

/** A rectangle in the middle of the photo, as a grid of the given size. */
const start = (cols: number, rows: number): Mesh => ({
  cols,
  rows,
  points: Array.from({ length: cols * rows }, (_, i) => [
    0.3 + (0.4 * (i % cols)) / (cols - 1),
    0.3 + (0.4 * Math.floor(i / cols)) / (rows - 1),
  ]),
});

const mesh = ref<Mesh>(start(2, 2));
const box = ref<HTMLElement | null>(null);
/** The point being dragged, or 'all' while the whole grid moves. */
const dragging = ref<number | 'all' | null>(null);
let last: Point = [0, 0];
const ratio = ref(1);
watch(
  model,
  (v) => {
    if (dragging.value === null) mesh.value = parseMesh(v ?? '') ?? start(2, 2);
  },
  { immediate: true },
);

const save = () => (model.value = formatMesh(mesh.value));
const sizes = Array.from({ length: MESH_MAX - MESH_MIN + 1 }, (_, i) => MESH_MIN + i);

/** A point inside the current grid (u, v from 0 to 1), bilinear within its cell. */
function sample(m: Mesh, u: number, v: number): Point {
  const cu = Math.min(m.cols - 2, Math.floor(u * (m.cols - 1)));
  const cv = Math.min(m.rows - 2, Math.floor(v * (m.rows - 1)));
  const fu = u * (m.cols - 1) - cu;
  const fv = v * (m.rows - 1) - cv;
  const p = (c: number, r: number) => m.points[r * m.cols + c];
  const [a, b, c, d] = [p(cu, cv), p(cu + 1, cv), p(cu, cv + 1), p(cu + 1, cv + 1)];
  return [0, 1].map((k) => (a[k] * (1 - fu) + b[k] * fu) * (1 - fv) + (c[k] * (1 - fu) + d[k] * fu) * fv) as Point;
}

function resize(cols: number, rows: number) {
  const old = mesh.value;
  mesh.value = {
    cols,
    rows,
    points: Array.from({ length: cols * rows }, (_, i) => sample(old, (i % cols) / (cols - 1), Math.floor(i / cols) / (rows - 1))),
  };
  save();
}

function at(e: PointerEvent): Point {
  const r = box.value!.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
}

function onDown(e: PointerEvent, i: number | 'all') {
  if (!box.value) return;
  dragging.value = i;
  last = at(e);
  (e.target as Element).setPointerCapture(e.pointerId);
}

function onMove(e: PointerEvent) {
  if (dragging.value === null || !box.value) return;
  const clamp = (v: number) => Math.min(1.2, Math.max(-0.2, v));
  const p = at(e);
  const points = [...mesh.value.points];
  if (dragging.value === 'all') {
    const [dx, dy] = [p[0] - last[0], p[1] - last[1]];
    for (let i = 0; i < points.length; i++) points[i] = [clamp(points[i][0] + dx), clamp(points[i][1] + dy)];
  } else points[dragging.value] = [clamp(p[0]), clamp(p[1])];
  last = p;
  mesh.value = { ...mesh.value, points };
}

function onUp() {
  if (dragging.value === null) return;
  dragging.value = null;
  save();
}

function reset() {
  mesh.value = start(mesh.value.cols, mesh.value.rows);
  save();
}

/** In the overlay's units: x from 0 to 100, y from 0 to 100 × the photo's height / width. */
const svgPoint = ([x, y]: Point) => `${x * 100} ${y * ratio.value * 100}`;
const lines = computed(() => {
  const { cols, rows, points } = mesh.value;
  const paths: string[] = [];
  for (let r = 0; r < rows; r++)
    paths.push(
      'M' +
        points
          .slice(r * cols, r * cols + cols)
          .map(svgPoint)
          .join('L'),
    );
  for (let c = 0; c < cols; c++) paths.push('M' + Array.from({ length: rows }, (_, r) => svgPoint(points[r * cols + c])).join('L'));
  return paths.join('');
});
const outline = computed(() => {
  const { cols, rows, points } = mesh.value;
  const p = (c: number, r: number) => points[r * cols + c];
  const ring = [
    ...Array.from({ length: cols }, (_, c) => p(c, 0)),
    ...Array.from({ length: rows - 1 }, (_, r) => p(cols - 1, r + 1)),
    ...Array.from({ length: cols - 1 }, (_, c) => p(cols - 2 - c, rows - 1)),
    ...Array.from({ length: rows - 2 }, (_, r) => p(0, rows - 2 - r)),
  ];
  return ring.map(svgPoint).join(' ');
});

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
      <div class="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span>{{ $t('Points') }}</span>
        <select
          class="input !w-auto !py-1 text-xs"
          :aria-label="$t('Columns')"
          :value="mesh.cols"
          data-mesh="cols"
          @change="resize(Number(($event.target as HTMLSelectElement).value), mesh.rows)"
        >
          <option v-for="n in sizes" :key="n" :value="n">{{ n }}</option>
        </select>
        <span>×</span>
        <select
          class="input !w-auto !py-1 text-xs"
          :aria-label="$t('Rows')"
          :value="mesh.rows"
          data-mesh="rows"
          @change="resize(mesh.cols, Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="n in sizes" :key="n" :value="n">{{ n }}</option>
        </select>
        <span class="text-slate-400">= {{ mesh.cols * mesh.rows }}</span>
      </div>
      <div ref="box" class="relative touch-none select-none overflow-hidden rounded-xl bg-slate-100" dir="ltr">
        <img :src="props.image" alt="" class="block w-full" draggable="false" @load="onLoad" />
        <svg class="absolute inset-0 h-full w-full" :viewBox="`0 0 100 ${ratio * 100}`" preserveAspectRatio="none">
          <polygon
            :points="outline"
            fill="rgba(37,99,235,0.18)"
            class="cursor-move"
            data-mesh="area"
            @pointerdown.prevent="onDown($event, 'all')"
            @pointermove="onMove"
            @pointerup="onUp"
            @pointercancel="onUp"
          />
          <path :d="lines" fill="none" stroke="#2563eb" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none" />
        </svg>
        <button
          v-for="(p, i) in mesh.points"
          :key="`${mesh.cols}x${mesh.rows}-${i}`"
          type="button"
          class="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-blue-600 bg-white shadow active:cursor-grabbing"
          :style="{ left: `${p[0] * 100}%`, top: `${p[1] * 100}%` }"
          :aria-label="$t('Point {n}', { n: i + 1 })"
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
