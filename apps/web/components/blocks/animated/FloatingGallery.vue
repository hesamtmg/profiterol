<script setup lang="ts">
/**
 * Photos scattered around a title that stays in the middle of the screen, drifting up at different speeds as
 * the visitor scrolls, as if at different depths: the far ones are smaller, slower and behind the title,
 * the near ones bigger, faster and in front of it. In the editor and for visitors who turn off motion the
 * photos hold still in their places.
 */
import EditableText from '../../site/EditableText.vue';

interface Photo {
  image: string;
  caption: string;
}

defineProps<{
  p: { eyebrow: string; title: string; text: string; buttonLabel: string; buttonLink: string; photos: Photo[] };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const moving = computed(() => !editing && !reduced.value);
const root = ref<HTMLElement | null>(null);

/** Where each photo sits (percent of the section, from the start side), how wide it is and how fast it drifts. */
const SLOTS = [
  { x: 4, y: 6, w: 24, speed: 0.3, near: false, tall: true },
  { x: 70, y: 3, w: 22, speed: 0.6, near: true, tall: false },
  { x: 76, y: 36, w: 18, speed: 0.25, near: false, tall: true },
  { x: 2, y: 44, w: 20, speed: 0.7, near: true, tall: false },
  { x: 34, y: 68, w: 18, speed: 0.35, near: false, tall: false },
  { x: 62, y: 66, w: 24, speed: 0.75, near: true, tall: true },
  { x: 40, y: 0, w: 14, speed: 0.15, near: false, tall: false },
  { x: 12, y: 80, w: 16, speed: 0.55, near: true, tall: true },
];

/** 0 as the section enters at the bottom of the screen, 1 as it leaves at the top. */
const progress = useScrollProgress(root, (r, vh) => (vh - r.top) / (vh + r.height), 0.5);

function photoStyle(i: number) {
  const slot = SLOTS[i % SLOTS.length]!;
  return {
    insetInlineStart: `${slot.x}%`,
    top: `${slot.y}%`,
    width: `${slot.w}%`,
    transform: moving.value ? `translateY(${(0.5 - progress.value) * slot.speed * 120}vh)` : undefined,
  };
}
</script>

<template>
  <section ref="root" class="relative overflow-clip bg-surface text-ink" :class="moving ? 'h-[200vh]' : 'min-h-[100dvh]'">
    <!-- Photos -->
    <figure
      v-for="(photo, i) in p.photos.slice(0, SLOTS.length)"
      :key="i"
      class="group absolute overflow-hidden rounded-2xl shadow-xl will-change-transform @3xl:rounded-[1.75rem]"
      :class="[SLOTS[i]!.near ? 'z-20' : 'z-0 opacity-80 saturate-[.85]', SLOTS[i]!.tall ? 'aspect-[3/4]' : 'aspect-[4/3]']"
      :style="photoStyle(i)"
    >
      <img
        v-if="photo.image"
        :src="photo.image"
        :alt="photo.caption"
        class="h-full w-full object-cover transition duration-700 group-hover:scale-110"
        loading="lazy"
      />
      <div v-else class="photo-placeholder h-full w-full" role="img" :aria-label="photo.caption" />
      <figcaption
        v-if="photo.caption"
        class="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/70 to-transparent p-3 text-xs font-medium text-white transition duration-500 group-hover:translate-y-0 @3xl:text-sm"
      >
        {{ photo.caption }}
      </figcaption>
    </figure>

    <!-- Title, held in the middle of the screen while the photos drift past -->
    <div class="pointer-events-none z-10 flex h-[100dvh] items-center justify-center px-6" :class="moving ? 'sticky top-0' : 'relative'">
      <div class="max-w-2xl text-center">
        <p v-if="p.eyebrow || editing" class="pointer-events-auto mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
        </p>
        <h2 class="pointer-events-auto text-5xl font-black leading-none tracking-tight @3xl:text-8xl">
          <EditableText :value="p.title" path="title" placeholder="Title" />
        </h2>
        <p v-if="p.text || editing" class="pointer-events-auto mx-auto mt-5 max-w-lg text-lg font-light text-muted">
          <EditableText :value="p.text" path="text" multiline />
        </p>
      </div>
    </div>

    <!-- The button, in a layer over the title's, so it stays above the near photos and can always be clicked -->
    <div
      v-if="p.buttonLabel"
      class="pointer-events-none z-30 -mt-[100dvh] flex h-[100dvh] items-end justify-center pb-[12dvh]"
      :class="moving ? 'sticky top-0' : 'relative'"
    >
      <a
        :href="editing ? undefined : resolveHref(p.buttonLink, locale)"
        class="pointer-events-auto inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
      >
        <EditableText :value="p.buttonLabel" path="buttonLabel" />
        <i class="mdi mdi-arrow-right rtl:rotate-180" />
      </a>
    </div>
  </section>
</template>
