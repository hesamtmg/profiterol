<script setup lang="ts">
/** The logo in the middle with the links split on both sides of it; phones get the full-screen menu. */
import HeaderLogo from './HeaderLogo.vue';
import HeaderMenu from './HeaderMenu.vue';
import { rememberLocale, type HeaderNav } from './nav';

const props = defineProps<{ nav: HeaderNav }>();
const open = ref(false);
const half = computed(() => Math.ceil(props.nav.links.length / 2));
const linkClass = 'relative py-1 text-xs font-semibold uppercase tracking-[0.2em] transition-opacity hover:opacity-60';
</script>

<template>
  <div
    class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-[1.5rem] px-5 py-3 @3xl:gap-8 @3xl:px-10 @3xl:py-5"
    :class="
      nav.light
        ? 'border border-white/25 text-white'
        : 'bg-[color-mix(in_srgb,var(--c-surface)_92%,transparent)] text-ink shadow-sm backdrop-blur'
    "
  >
    <nav class="hidden items-center gap-8 @3xl:flex">
      <a v-for="(link, i) in nav.links.slice(0, half)" :key="i" :href="link.href" :class="linkClass">{{ link.label }}</a>
    </nav>
    <span class="@3xl:hidden" />

    <HeaderLogo :nav="nav" text-class="text-xl font-black uppercase tracking-[0.25em] @3xl:text-2xl" image-class="h-10" />

    <div class="flex items-center justify-end gap-8">
      <nav class="hidden items-center gap-8 @3xl:flex">
        <a v-for="(link, i) in nav.links.slice(half)" :key="i" :href="link.href" :class="linkClass">{{ link.label }}</a>
      </nav>
      <a
        v-if="nav.cta"
        :href="nav.cta.href"
        class="hidden whitespace-nowrap rounded-[var(--radius-button)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition hover:scale-105 @3xl:block"
        :class="nav.light ? 'bg-white text-dark' : 'bg-dark text-white'"
      >
        {{ nav.cta.label }}
      </a>
      <a
        v-for="l in nav.languages"
        :key="l.code"
        :href="l.href"
        :lang="l.code"
        class="hidden text-xs font-medium @3xl:block"
        :class="linkClass"
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
