<script setup lang="ts">
/** minicms kind 1: a muted video across the whole width (with a phone version) and a light title over it. */
import EditableText from '../../site/EditableText.vue';

defineProps<{ p: { video: string; mobileVideo: string; poster: string; title: string }; locale: string }>();

const root = ref<HTMLElement | null>(null);

// Visitors who turn off motion see the first frame instead.
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.value?.querySelectorAll('video').forEach((v) => v.pause());
});
</script>

<template>
  <section
    ref="root"
    class="relative isolate flex h-[85dvh] min-h-[420px] w-full items-end justify-center overflow-hidden bg-black text-white"
  >
    <template v-if="p.video || p.mobileVideo">
      <video
        :src="p.video || p.mobileVideo"
        :poster="p.poster || undefined"
        class="absolute inset-0 -z-10 h-full w-full object-cover"
        :class="{ 'hidden @3xl:block': p.mobileVideo && p.video }"
        autoplay
        muted
        loop
        playsinline
        aria-hidden="true"
      />
      <video
        v-if="p.mobileVideo && p.video"
        :src="p.mobileVideo"
        :poster="p.poster || undefined"
        class="absolute inset-0 -z-10 h-full w-full object-cover @3xl:hidden"
        autoplay
        muted
        loop
        playsinline
        aria-hidden="true"
      />
    </template>
    <img v-else-if="p.poster" :src="p.poster" alt="" class="absolute inset-0 -z-10 h-full w-full object-cover" />
    <div v-else class="photo-placeholder absolute inset-0 -z-10" />
    <div class="absolute inset-0 -z-10 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

    <h1 class="mb-[12%] px-6 text-center text-3xl font-extralight leading-snug drop-shadow @3xl:mb-[8%] @3xl:text-6xl">
      <EditableText :value="p.title" path="title" placeholder="Title" />
    </h1>
  </section>
</template>
