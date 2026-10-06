<script setup lang="ts">
/**
 * A list of big titles. Pointing at one shows its photo, which floats after the mouse with a little lag and
 * leans the way it moves; the other rows dim. Touch screens, the editor and visitors who turn off motion get
 * a small photo at the end of each row instead (decided in CSS, so the served page already has the right one).
 */
import EditableText from '../../site/EditableText.vue';

interface Item {
  image: string;
  title: string;
  meta: string;
  link: string;
}

defineProps<{ p: { title: string; items: Item[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const root = ref<HTMLElement | null>(null);
const preview = ref<HTMLElement | null>(null);
const active = ref<number | null>(null);

const target = { x: 0, y: 0 };
const pos = { x: 0, y: 0 };
let frame = 0;

function follow() {
  const dx = target.x - pos.x;
  pos.x += dx * 0.16;
  pos.y += (target.y - pos.y) * 0.16;
  if (preview.value) {
    const lean = Math.max(-12, Math.min(12, dx * 0.08));
    preview.value.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%) rotate(${lean}deg)`;
  }
  frame = Math.abs(dx) + Math.abs(target.y - pos.y) > 0.5 ? requestAnimationFrame(follow) : 0;
}

function onMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || editing || reduced.value || !root.value) return;
  const r = root.value.getBoundingClientRect();
  target.x = e.clientX - r.left;
  target.y = e.clientY - r.top;
  if (active.value === null) {
    // Appear where the mouse is rather than flying in from the last place.
    pos.x = target.x;
    pos.y = target.y;
  }
  frame ||= requestAnimationFrame(follow);
}

function enter(i: number, e: PointerEvent) {
  if (e.pointerType !== 'mouse' || editing || reduced.value) return;
  onMove(e);
  active.value = i;
}

onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <section ref="root" class="relative bg-surface px-6 py-20 text-ink @3xl:px-16 @3xl:py-28" @pointermove="onMove">
    <div class="mx-auto max-w-6xl">
      <h2 v-if="p.title || editing" class="mb-10 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
        <EditableText :value="p.title" path="title" placeholder="Title" />
      </h2>
      <ul class="border-t border-slate-300/60" @pointerleave="active = null">
        <li v-for="(item, i) in p.items" :key="i" class="border-b border-slate-300/60">
          <component
            :is="item.link && !editing ? 'a' : 'div'"
            :href="item.link && !editing ? resolveHref(item.link, locale) : undefined"
            class="group flex items-center gap-4 py-6 transition-opacity duration-300 @3xl:py-8"
            :class="active !== null && active !== i ? 'opacity-30' : ''"
            @pointerenter="enter(i, $event)"
          >
            <span class="w-8 shrink-0 text-xs font-semibold tabular-nums text-muted">{{ String(i + 1).padStart(2, '0') }}</span>
            <span
              class="min-w-0 flex-1 text-3xl font-black tracking-tight transition-all duration-500 group-hover:text-primary @3xl:text-6xl"
              :class="editing ? '' : 'group-hover:ps-4'"
            >
              <EditableText :value="item.title" :path="`items.${i}.title`" placeholder="Title" />
            </span>
            <span v-if="item.meta || editing" class="hidden shrink-0 text-sm text-muted @xl:block">
              <EditableText :value="item.meta" :path="`items.${i}.meta`" placeholder="Small text" />
            </span>
            <span class="w-16 shrink-0 overflow-hidden rounded-lg @3xl:w-24" :class="editing ? '' : 'thumb-only'">
              <img v-if="item.image" :src="item.image" alt="" class="aspect-[4/3] w-full object-cover" loading="lazy" />
              <span v-else class="photo-placeholder block aspect-[4/3] w-full" />
            </span>
            <i v-if="item.link" class="mdi mdi-arrow-top-right text-2xl text-muted transition group-hover:text-primary rtl:-scale-x-100" />
          </component>
        </li>
      </ul>
    </div>

    <!-- The floating photo: every row's photo is stacked here, so switching rows is a cross-fade -->
    <div v-if="!editing" ref="preview" class="pointer-events-none absolute left-0 top-0 z-10 w-64 @3xl:w-80" aria-hidden="true">
      <div
        class="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl transition duration-300"
        :class="active === null ? 'scale-75 opacity-0' : 'scale-100 opacity-100'"
      >
        <template v-for="(item, i) in p.items" :key="i">
          <img
            v-if="item.image"
            :src="item.image"
            alt=""
            class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
            :class="active === i ? 'opacity-100' : 'opacity-0'"
            loading="lazy"
          />
          <div
            v-else
            class="photo-placeholder absolute inset-0 transition-opacity duration-300"
            :class="active === i ? 'opacity-100' : 'opacity-0'"
          />
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .thumb-only {
    display: none;
  }
}
</style>
