<script setup lang="ts">
defineProps<{
  p: { title: string; text: string; image: string; imageSide: string; buttonLabel: string; buttonLink: string };
  locale: string;
}>();
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div class="panel grid items-center gap-8 p-4 @3xl:grid-cols-2 @3xl:gap-14 @3xl:p-6">
      <div class="aspect-[4/3] overflow-hidden rounded-[1.75rem] @3xl:rounded-[3rem]" :class="{ '@3xl:order-2': p.imageSide === 'end' }">
        <img v-if="p.image" :src="p.image" :alt="p.title" loading="lazy" class="h-full w-full object-cover" />
        <div v-else class="h-full w-full bg-gradient-to-br from-secondary via-primary to-dark" />
      </div>
      <div class="px-3 pb-6 @3xl:px-8 @3xl:pb-0">
        <h2 class="text-2xl font-black @3xl:text-4xl">{{ p.title }}</h2>
        <p class="mt-4 whitespace-pre-line text-base font-extralight leading-loose text-muted @3xl:text-lg">{{ p.text }}</p>
        <a
          v-if="p.buttonLabel"
          :href="resolveHref(p.buttonLink, locale)"
          class="btn-pill mt-6 bg-primary text-white hover:shadow-lg hover:brightness-110"
        >
          {{ p.buttonLabel }}
        </a>
      </div>
    </div>
  </section>
</template>
