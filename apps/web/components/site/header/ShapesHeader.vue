<script setup lang="ts">
/**
 * The undplus.com header: the logo at the start and every link in a shape of its own (pill, hexagon, square, in
 * turn). It stays at the top while scrolling and looks at what is behind it: black shapes over light panels, white
 * ones over dark panels. Phones get a "Menu" pill opening the full-screen menu.
 */
import HeaderLogo from './HeaderLogo.vue';
import HeaderMenu from './HeaderMenu.vue';
import { rememberLocale, type HeaderNav } from './nav';

const props = defineProps<{ nav: HeaderNav }>();
const open = ref(false);
const bar = ref<HTMLElement | null>(null);
/** What is behind the header is dark: draw it in white. Over a first-screen hero it starts that way. */
const onDark = ref(props.nav.light);
const logoNav = computed(() => ({ ...props.nav, light: onDark.value }));

/** The first color painted behind a point: the background of the element there or of one of its parents. */
function backdropAt(x: number, y: number): number[] | null {
  for (let el = document.elementsFromPoint(x, y).find((e) => !bar.value?.contains(e)) ?? null; el; el = el.parentElement) {
    const rgba = getComputedStyle(el)
      .backgroundColor.match(/[\d.]+/g)
      ?.map(Number);
    if (rgba && (rgba[3] ?? 1) > 0.5) return rgba;
  }
  return null;
}

useScrollFrame(() => {
  if (!bar.value) return;
  const r = bar.value.getBoundingClientRect();
  const rgb = backdropAt(r.left + 8, r.top + r.height / 2);
  if (rgb) onDark.value = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] < 140;
});

const shapes = ['rounded-full', 'shape-hexagon px-6', 'rounded-none'];
const shapeOf = (i: number) => shapes[i % shapes.length];
</script>

<template>
  <div
    ref="bar"
    class="inset-x-0 top-0 flex items-start justify-between gap-4 px-5 pt-5 transition-colors duration-300 @3xl:px-10 @3xl:pt-8"
    :class="[nav.preview ? 'absolute z-10' : 'fixed z-40', onDark ? 'text-white' : 'text-black']"
    :style="{ '--ink': onDark ? '#fff' : '#000', '--paper': onDark ? '#000' : '#fff' }"
  >
    <HeaderLogo :nav="logoNav" text-class="text-xl font-bold uppercase tracking-tight @3xl:text-2xl" image-class="h-12 @3xl:h-20" />

    <nav class="hidden items-center gap-3 @3xl:flex">
      <a
        v-for="(link, i) in nav.links"
        :key="i"
        :href="link.href"
        class="shape-link px-3.5 py-3 text-sm font-medium uppercase leading-none transition duration-300 hover:-rotate-3 hover:scale-105"
        :class="shapeOf(i)"
      >
        {{ link.label }}
      </a>
      <a
        v-if="nav.cta"
        :href="nav.cta.href"
        class="shape-link px-3.5 py-3 text-sm font-medium uppercase leading-none transition duration-300 hover:-rotate-3 hover:scale-105"
        :class="shapeOf(nav.links.length)"
      >
        {{ nav.cta.label }}
      </a>
      <a
        v-for="l in nav.languages"
        :key="l.code"
        :href="l.href"
        :lang="l.code"
        class="ms-2 text-xs font-medium uppercase opacity-80 hover:opacity-100"
        @click="rememberLocale(l.code)"
      >
        {{ l.label }}
      </a>
    </nav>

    <button
      type="button"
      class="shape-link rounded-full px-4 py-2.5 text-sm font-medium uppercase leading-none @3xl:hidden"
      aria-haspopup="dialog"
      @click="open = true"
    >
      {{ nav.locale === 'fa' ? 'منو' : 'Menu' }}
    </button>
  </div>
  <!-- Not floating over a hero: keep the page's first block clear of it -->
  <div v-if="!nav.light" class="h-24 @3xl:h-36" />
  <HeaderMenu :nav="nav" :open="open" @close="open = false" />
</template>

<style scoped>
.shape-link {
  background: var(--ink);
  color: var(--paper);
  transition-duration: 300ms;
}
.shape-hexagon {
  clip-path: polygon(0 50%, 14% 0, 86% 0, 100% 50%, 86% 100%, 14% 100%);
}
</style>
