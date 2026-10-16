<script setup lang="ts">
/**
 * A small dark pill floating in the middle of the top of the screen: a round logo, the links and the header button.
 * It slides away while the visitor scrolls down and comes back as soon as they scroll up. Phones get the round logo,
 * the name and a menu button.
 */
import HeaderMenu from './HeaderMenu.vue';
import { rememberLocale, type HeaderNav } from './nav';

const props = defineProps<{ nav: HeaderNav }>();
const open = ref(false);
const hidden = ref(false);
let last = 0;

useScrollFrame(() => {
  if (props.nav.preview) return;
  const y = window.scrollY;
  if (Math.abs(y - last) < 6) return;
  hidden.value = y > last && y > 160;
  last = y;
});

const initial = computed(() => Array.from(props.nav.siteName.trim())[0] ?? '•');
</script>

<template>
  <div
    class="pointer-events-none inset-x-0 top-3 z-40 flex justify-center px-3 transition-transform duration-500 @3xl:top-5"
    :class="[nav.preview ? 'absolute' : 'fixed', hidden ? '-translate-y-[150%]' : '']"
  >
    <div
      class="pointer-events-auto flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--c-dark)_92%,transparent)] p-1.5 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur"
    >
      <a
        :href="`/${nav.locale}`"
        class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-lg font-black text-dark"
        :aria-label="nav.siteName"
      >
        <img v-if="nav.logo" :src="nav.logo" alt="" class="h-6 w-6 object-contain" />
        <span v-else>{{ initial }}</span>
      </a>
      <span class="px-3 text-sm font-semibold @3xl:hidden">{{ nav.siteName }}</span>
      <nav class="hidden items-center @3xl:flex">
        <a
          v-for="(link, i) in nav.links"
          :key="i"
          :href="link.href"
          class="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          {{ link.label }}
        </a>
      </nav>
      <a
        v-for="l in nav.languages"
        :key="l.code"
        :href="l.href"
        :lang="l.code"
        class="hidden rounded-full px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 @3xl:block"
        @click="rememberLocale(l.code)"
      >
        {{ l.label }}
      </a>
      <a
        v-if="nav.cta"
        :href="nav.cta.href"
        class="hidden rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 @3xl:block"
      >
        {{ nav.cta.label }}
      </a>
      <button
        type="button"
        class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl @3xl:hidden"
        :aria-label="nav.locale === 'fa' ? 'منو' : 'Menu'"
        @click="open = true"
      >
        <i class="mdi mdi-menu" />
      </button>
    </div>
  </div>
  <HeaderMenu :nav="nav" :open="open" @close="open = false" />
</template>
