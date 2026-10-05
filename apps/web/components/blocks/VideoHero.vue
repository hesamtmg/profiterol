<script setup lang="ts">
/** A muted, looping background video with a title and a button. */
import EditableText from '../site/EditableText.vue';

defineProps<{
  p: { video: string; poster: string; title: string; text: string; buttonLabel: string; buttonLink: string; height: string };
  locale: string;
}>();

const videoEl = ref<HTMLVideoElement | null>(null);

// Respect the visitor's "reduce motion" setting: show the first frame instead of playing.
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) videoEl.value?.pause();
});
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div
      class="relative flex overflow-hidden rounded-[2rem] bg-dark text-white @3xl:rounded-card"
      :class="p.height === 'medium' ? 'min-h-[55vh]' : 'min-h-[80vh]'"
    >
      <video
        v-if="p.video"
        ref="videoEl"
        :src="p.video"
        :poster="p.poster || undefined"
        class="absolute inset-0 h-full w-full object-cover"
        autoplay
        muted
        loop
        playsinline
        aria-hidden="true"
      />
      <img v-else-if="p.poster" :src="p.poster" alt="" class="absolute inset-0 h-full w-full object-cover" />
      <div
        v-else
        class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--c-primary),transparent_55%),radial-gradient(circle_at_80%_80%,var(--c-secondary),transparent_50%)]"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <div class="relative mt-auto flex max-w-3xl flex-col items-start gap-5 p-8 @3xl:p-16">
        <h1 class="text-4xl font-black leading-tight @3xl:text-7xl"><EditableText :value="p.title" path="title" /></h1>
        <p class="text-lg font-extralight opacity-90 @3xl:text-2xl"><EditableText :value="p.text" path="text" multiline /></p>
        <a
          v-if="p.buttonLabel"
          :href="resolveHref(p.buttonLink, locale)"
          class="btn-pill bg-white text-dark hover:scale-105 hover:shadow-xl"
        >
          <EditableText :value="p.buttonLabel" path="buttonLabel" />
          <i class="mdi mdi-arrow-right rtl:rotate-180" />
        </a>
      </div>
    </div>
  </section>
</template>
