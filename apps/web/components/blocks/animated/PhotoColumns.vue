<script setup lang="ts">
/**
 * A title beside three columns of photos gliding forever, the middle one the other way. Each column holds its
 * photos twice and slides by one copy's height, so the loop has no seam. Pure CSS: pointing at the photos
 * pauses them, and in the editor and for visitors who turn off motion they stand still.
 */
import EditableText from '../../site/EditableText.vue';

interface Photo {
  image: string;
  caption: string;
}

const props = defineProps<{
  p: {
    eyebrow: string;
    title: string;
    text: string;
    buttonLabel: string;
    buttonLink: string;
    photos: Photo[];
    seconds: number;
    look: string;
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const seconds = computed(() => Math.max(Number(props.p.seconds) || 30, 5));

/** Photos dealt into three columns like cards; each column moves at its own pace. */
const columns = computed(() => {
  const photos = props.p.photos ?? [];
  return [0, 1, 2].map((c) => ({
    photos: photos.filter((_, i) => i % 3 === c),
    reverse: c === 1,
    duration: `${seconds.value * [1, 1.2, 0.9][c]!}s`,
  }));
});
</script>

<template>
  <section class="overflow-hidden px-6 @3xl:px-16" :class="p.look === 'dark' ? 'bg-dark text-white' : 'bg-surface text-ink'">
    <div class="mx-auto grid max-w-7xl items-center gap-10 @3xl:grid-cols-[1fr_1.1fr] @3xl:gap-16">
      <div class="pt-20 text-center @3xl:py-28 @3xl:text-start">
        <p v-if="p.eyebrow || editing" class="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
          <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
        </p>
        <h2 class="text-5xl font-black leading-[0.95] tracking-tight @3xl:text-7xl">
          <EditableText :value="p.title" path="title" placeholder="Title" />
        </h2>
        <p v-if="p.text || editing" class="mt-6 max-w-md text-lg font-light opacity-75 mx-auto @3xl:mx-0">
          <EditableText :value="p.text" path="text" multiline />
        </p>
        <a
          v-if="p.buttonLabel"
          :href="editing ? undefined : resolveHref(p.buttonLink, locale)"
          class="mt-8 inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
        >
          <EditableText :value="p.buttonLabel" path="buttonLabel" />
          <i class="mdi mdi-arrow-right rtl:rotate-180" />
        </a>
      </div>

      <div
        class="columns-box grid h-[70vh] grid-cols-3 gap-3 @3xl:h-[100dvh] @3xl:max-h-[56rem] @3xl:gap-4"
        :class="{ 'columns-still': editing }"
      >
        <div v-for="(col, c) in columns" :key="c" class="min-w-0">
          <div
            class="photo-column flex flex-col"
            :class="{ 'photo-column-reverse': col.reverse }"
            :style="{ animationDuration: col.duration }"
          >
            <!-- Two copies, so when the first has slid out of view the second is exactly where it started -->
            <div
              v-for="copy in 2"
              :key="copy"
              class="flex flex-col gap-3 pb-3 @3xl:gap-4 @3xl:pb-4"
              :aria-hidden="copy === 2 ? 'true' : undefined"
            >
              <figure v-for="(photo, i) in col.photos" :key="i" class="overflow-hidden rounded-2xl shadow-lg">
                <img
                  v-if="photo.image"
                  :src="photo.image"
                  :alt="copy === 1 ? photo.caption : ''"
                  class="w-full object-cover"
                  :class="(i + c) % 2 ? 'aspect-[4/5]' : 'aspect-[3/4]'"
                  loading="lazy"
                />
                <div
                  v-else
                  class="photo-placeholder w-full"
                  :class="(i + c) % 2 ? 'aspect-[4/5]' : 'aspect-[3/4]'"
                  :role="copy === 1 ? 'img' : undefined"
                  :aria-label="copy === 1 ? photo.caption : undefined"
                />
              </figure>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Soft top and bottom edges, so photos fade in and out rather than being cut. */
.columns-box {
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent);
}
.photo-column {
  animation: column-up linear infinite;
}
.photo-column-reverse {
  animation-direction: reverse;
}
.columns-box:hover .photo-column,
.columns-still .photo-column {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .photo-column {
    animation: none;
  }
}
@keyframes column-up {
  to {
    transform: translateY(-50%);
  }
}
</style>
