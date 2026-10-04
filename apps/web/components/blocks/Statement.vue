<script setup lang="ts">
const props = defineProps<{
  p: { title: string; text: string; image: string; buttonLabel: string; buttonLink: string };
  locale: string;
}>();

const background = computed(() =>
  props.p.image
    ? `linear-gradient(rgb(0 0 0 / .55), rgb(0 0 0 / .55)), url("${encodeURI(props.p.image)}") center / cover`
    : 'radial-gradient(circle at 80% 0%, var(--c-secondary), transparent 50%), var(--c-dark)',
);
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div
      class="flex min-h-[50vh] flex-col items-center justify-center rounded-[2rem] px-6 py-16 text-center text-white @3xl:rounded-card @3xl:px-20"
      :style="{ background }"
    >
      <h2 class="max-w-4xl text-3xl font-black leading-tight @3xl:text-6xl">{{ p.title }}</h2>
      <p class="mt-5 max-w-2xl text-base font-extralight opacity-90 @3xl:text-xl">{{ p.text }}</p>
      <a
        v-if="p.buttonLabel"
        :href="resolveHref(p.buttonLink, locale)"
        class="btn-pill mt-8 border border-white/60 hover:bg-white hover:text-dark"
      >
        {{ p.buttonLabel }}
      </a>
    </div>
  </section>
</template>
