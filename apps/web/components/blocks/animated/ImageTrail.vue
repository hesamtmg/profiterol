<script setup lang="ts">
/**
 * Moving the mouse over the block leaves a trail of photos: one pops up every so many pixels and fades away a
 * moment later. Touch screens, the editor and visitors who turn off motion get the photos in a row under the
 * title instead (decided in CSS, so the page served by the server already has the right one).
 */
import EditableText from '../../site/EditableText.vue';

interface Photo {
  image: string;
  caption: string;
}
interface Drop {
  id: number;
  x: number;
  y: number;
  photo: Photo;
  turn: number;
}

const props = defineProps<{
  p: { eyebrow: string; title: string; text: string; hint: string; photos: Photo[] };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const root = ref<HTMLElement | null>(null);
const drops = ref<Drop[]>([]);
/** Pixels the mouse travels between two photos. */
const GAP = 90;
const MAX_ON_SCREEN = 10;

let next = 0;
let id = 0;
let last: { x: number; y: number } | null = null;

function onMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || editing || reduced.value || !props.p.photos?.length || !root.value) return;
  const r = root.value.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  if (last && Math.hypot(x - last.x, y - last.y) < GAP) return;
  last = { x, y };
  const photo = props.p.photos[next++ % props.p.photos.length]!;
  drops.value = [...drops.value.slice(-(MAX_ON_SCREEN - 1)), { id: id++, x, y, photo, turn: Math.random() * 16 - 8 }];
}

function remove(dropId: number) {
  drops.value = drops.value.filter((d) => d.id !== dropId);
}
</script>

<template>
  <section
    ref="root"
    class="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-surface px-6 py-24 text-ink @3xl:px-16"
    @pointermove="onMove"
    @pointerleave="last = null"
  >
    <div class="relative z-10 max-w-4xl text-center">
      <p v-if="p.eyebrow || editing" class="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
        <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
      </p>
      <h2 class="text-5xl font-black leading-none tracking-tight @3xl:text-8xl">
        <EditableText :value="p.title" path="title" placeholder="Title" />
      </h2>
      <p v-if="p.text || editing" class="mx-auto mt-6 max-w-xl text-lg font-light text-muted">
        <EditableText :value="p.text" path="text" multiline />
      </p>
      <p
        v-if="p.hint && !editing"
        class="trail-only mt-10 inline-flex items-center gap-2 rounded-full border border-slate-300/60 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-muted"
      >
        <i class="mdi mdi-cursor-default-outline" aria-hidden="true" />
        {{ p.hint }}
      </p>
      <p v-else-if="editing" class="mt-10 text-xs uppercase tracking-widest text-muted">
        <EditableText :value="p.hint" path="hint" placeholder="Hint" />
      </p>

      <!-- Without a mouse (or with motion turned off) the photos sit in a row -->
      <ul class="mt-12 flex flex-wrap justify-center gap-3" :class="editing ? '' : 'row-only'">
        <li v-for="(photo, i) in p.photos.slice(0, 6)" :key="i" class="w-24 overflow-hidden rounded-xl shadow-md @3xl:w-32">
          <img v-if="photo.image" :src="photo.image" :alt="photo.caption" class="aspect-[3/4] w-full object-cover" loading="lazy" />
          <div v-else class="photo-placeholder aspect-[3/4] w-full" role="img" :aria-label="photo.caption" />
        </li>
      </ul>
    </div>

    <!-- The trail -->
    <div class="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <div v-for="d in drops" :key="d.id" class="absolute -translate-x-1/2 -translate-y-1/2" :style="{ left: `${d.x}px`, top: `${d.y}px` }">
        <div
          class="trail-photo w-36 overflow-hidden rounded-2xl shadow-2xl @3xl:w-52"
          :style="{ '--turn': `${d.turn}deg` }"
          @animationend="remove(d.id)"
        >
          <img v-if="d.photo.image" :src="d.photo.image" alt="" class="aspect-[3/4] w-full object-cover" />
          <div v-else class="photo-placeholder aspect-[3/4] w-full" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.trail-photo {
  animation: trail 1.2s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}
@keyframes trail {
  0% {
    opacity: 0;
    transform: scale(0.5) rotate(var(--turn));
  }
  15% {
    opacity: 1;
    transform: scale(1) rotate(var(--turn));
  }
  65% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(0.85) translateY(1.5rem) rotate(var(--turn));
  }
}

/* A mouse and motion: the trail and its hint. Otherwise: the row of photos. */
.trail-only {
  display: none;
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .trail-only {
    display: inline-flex;
  }
  .row-only {
    display: none;
  }
}
</style>
