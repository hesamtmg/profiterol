<script setup lang="ts">
/**
 * No bar at all at the top of the page: the name, links whose underline grows from the start on hover, and the
 * header button as a text link. Once the page scrolls it settles into a slim bar with a background.
 */
import HeaderLogo from './HeaderLogo.vue';
import HeaderMenu from './HeaderMenu.vue';
import { rememberLocale, useScrolledPast, type HeaderNav } from './nav';

const props = defineProps<{ nav: HeaderNav }>();
const open = ref(false);
const scrolled = useScrolledPast(24, () => props.nav.preview || props.nav.light);
</script>

<template>
  <div
    class="flex items-center justify-between gap-6 rounded-[1.5rem] px-5 transition-all duration-500 @3xl:px-8"
    :class="[
      scrolled ? 'bg-[color-mix(in_srgb,var(--c-surface)_90%,transparent)] py-3 shadow-lg backdrop-blur' : 'py-5 @3xl:py-7',
      nav.light ? 'text-white' : 'text-ink',
    ]"
  >
    <HeaderLogo :nav="nav" with-name text-class="text-lg font-semibold tracking-tight" image-class="h-8" />

    <nav class="hidden items-center gap-9 @3xl:flex">
      <a v-for="(link, i) in nav.links" :key="i" :href="link.href" class="underline-grow relative py-1 text-sm">{{ link.label }}</a>
    </nav>

    <div class="flex items-center gap-5">
      <a
        v-if="nav.cta"
        :href="nav.cta.href"
        class="underline-grow relative hidden items-center gap-1.5 py-1 text-sm font-semibold @3xl:flex"
      >
        {{ nav.cta.label }} <i class="mdi mdi-arrow-top-right rtl:-scale-x-100" aria-hidden="true" />
      </a>
      <a
        v-for="l in nav.languages"
        :key="l.code"
        :href="l.href"
        :lang="l.code"
        class="text-xs font-medium uppercase opacity-70 hover:opacity-100"
        @click="rememberLocale(l.code)"
      >
        {{ l.label }}
      </a>
      <button type="button" class="text-2xl @3xl:hidden" :aria-label="nav.locale === 'fa' ? 'منو' : 'Menu'" @click="open = true">
        <i class="mdi mdi-menu" />
      </button>
    </div>
  </div>
  <HeaderMenu :nav="nav" :open="open" @close="open = false" />
</template>

<style scoped>
.underline-grow::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: var(--origin, left);
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
[dir='rtl'] .underline-grow::after {
  --origin: right;
}
.underline-grow:hover::after {
  transform: scaleX(1);
}
</style>
