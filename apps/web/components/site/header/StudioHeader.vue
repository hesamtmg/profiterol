<script setup lang="ts">
/**
 * The awakeagency.dev header: a big lowercase name, the header button and a "menu." button that opens the
 * full-screen menu on every screen size. Once the page has scrolled a screen down, the menu button stays at the
 * top corner on its own.
 */
import HeaderLogo from './HeaderLogo.vue';
import HeaderMenu from './HeaderMenu.vue';
import MenuButton from './MenuButton.vue';
import { useScrolledPast, type HeaderNav } from './nav';

const props = defineProps<{ nav: HeaderNav }>();
const open = ref(false);
const scrolled = useScrolledPast(500, () => props.nav.preview);
</script>

<template>
  <div class="flex items-center justify-between gap-4 px-3 pt-6 @3xl:px-10 @3xl:pt-10" :class="nav.light ? 'text-white' : 'text-ink'">
    <HeaderLogo :nav="nav" text-class="text-3xl font-medium tracking-tight @3xl:text-[2.6rem]" image-class="h-10" />
    <div class="flex items-center gap-2">
      <a
        v-if="nav.cta"
        :href="nav.cta.href"
        class="hidden rounded-full px-6 py-2.5 text-lg leading-none transition @xl:block"
        :class="
          nav.light
            ? 'bg-white/20 hover:bg-white/30'
            : 'bg-[color-mix(in_srgb,var(--c-primary)_12%,transparent)] text-primary hover:bg-[color-mix(in_srgb,var(--c-primary)_20%,transparent)]'
        "
      >
        {{ nav.cta.label }}
      </a>
      <MenuButton :locale="nav.locale" :light="nav.light" @click="open = true" />
    </div>
  </div>

  <Transition
    enter-active-class="transition duration-300"
    leave-active-class="transition duration-300"
    enter-from-class="opacity-0 -translate-y-3"
    leave-to-class="opacity-0 -translate-y-3"
  >
    <div v-if="scrolled && !open" class="fixed end-4 top-4 z-40 @3xl:end-8 @3xl:top-8">
      <MenuButton :locale="nav.locale" dark class="shadow-xl ring-1 ring-white/20" @click="open = true" />
    </div>
  </Transition>

  <HeaderMenu :nav="nav" :open="open" @close="open = false" />
</template>
