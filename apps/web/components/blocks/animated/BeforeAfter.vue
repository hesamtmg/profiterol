<script setup lang="ts">
/**
 * Two photos on top of each other with a handle to drag between them. A real range input covers the
 * photos, so dragging, touch and the keyboard all work. The handle sweeps once when first seen, as a hint.
 */
import EditableText from '../../site/EditableText.vue';

defineProps<{ p: { title: string; before: string; after: string; beforeLabel: string; afterLabel: string }; locale: string }>();
const editing = Boolean(useBlockEditing());
const position = ref(50);
const box = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | undefined;
let frame = 0;

/** 50 → 25 → 75 → 50 over 1.8 s. */
function hint() {
  const start = performance.now();
  const keys = [50, 25, 75, 50];
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 1800) * (keys.length - 1);
    const k = Math.min(Math.floor(t), keys.length - 2);
    const f = t - k;
    const ease = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
    position.value = keys[k] + (keys[k + 1] - keys[k]) * ease;
    if (t < keys.length - 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}

onMounted(() => {
  if (editing || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !box.value) return;
  observer = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      observer?.disconnect();
      hint();
    },
    { threshold: 0.5 },
  );
  observer.observe(box.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  cancelAnimationFrame(frame);
});

function onInput(e: Event) {
  cancelAnimationFrame(frame);
  position.value = Number((e.target as HTMLInputElement).value);
}
</script>

<template>
  <section class="bg-surface px-6 py-20 text-ink @3xl:px-16 @3xl:py-28">
    <div class="mx-auto max-w-5xl">
      <h2 v-if="p.title || editing" class="mb-10 text-center text-3xl font-black @3xl:text-5xl"><EditableText :value="p.title" path="title" placeholder="Title" /></h2>
      <div ref="box" class="relative aspect-[16/10] select-none overflow-hidden rounded-[2rem] shadow-2xl" dir="ltr">
        <img v-if="p.after" :src="p.after" :alt="p.afterLabel" class="absolute inset-0 h-full w-full object-cover" loading="lazy" draggable="false" />
        <div v-else class="absolute inset-0" style="background: linear-gradient(135deg, var(--c-primary), var(--c-dark))" />
        <div class="absolute inset-0" :style="{ clipPath: `inset(0 ${100 - position}% 0 0)` }">
          <img v-if="p.before" :src="p.before" :alt="p.beforeLabel" class="absolute inset-0 h-full w-full object-cover" loading="lazy" draggable="false" />
          <div v-else class="absolute inset-0 grayscale" style="background: linear-gradient(135deg, var(--c-secondary), #555)" />
        </div>

        <span class="glass absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white">
          <EditableText :value="p.beforeLabel" path="beforeLabel" />
        </span>
        <span class="glass absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white">
          <EditableText :value="p.afterLabel" path="afterLabel" />
        </span>

        <!-- Handle -->
        <div class="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgb(0_0_0/0.4)]" :style="{ left: `${position}%` }" aria-hidden="true">
          <span class="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl text-dark shadow-xl">
            <i class="mdi mdi-arrow-left-right" />
          </span>
        </div>

        <input
          v-if="!editing"
          type="range"
          min="0"
          max="100"
          step="0.1"
          :value="position"
          class="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
          :aria-label="`${p.beforeLabel} / ${p.afterLabel}`"
          @input="onInput"
        />
      </div>
    </div>
  </section>
</template>
