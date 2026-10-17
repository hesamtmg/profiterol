<script setup lang="ts">
/**
 * The mikewilcockdesign.com header: a full-width dark bar with the name (the first word in bold capitals, the rest in
 * light italics with its first letter on a highlight), the city and its live local time in the middle, small
 * spaced-out monospace links and the header button as a pill in the main color. Phones get the full-screen menu.
 */
import HeaderMenu from './HeaderMenu.vue';
import { rememberLocale, type HeaderNav } from './nav';

const props = defineProps<{ nav: HeaderNav }>();
const open = ref(false);
const time = useLocalClock(
  () => props.nav.timeZone,
  () => props.nav.locale,
);

const name = computed(() => {
  const [first = '', ...rest] = props.nav.siteName.trim().split(/\s+/);
  const tail = rest.join(' ');
  return { first, mark: tail.slice(0, 1), rest: tail.slice(1) };
});
const label = 'font-mono text-[0.7rem] uppercase tracking-[0.14em] rtl:font-[inherit] rtl:text-xs rtl:tracking-normal';
</script>

<template>
  <div
    class="grid grid-cols-[1fr_auto] items-center gap-6 px-5 py-4 @3xl:px-14 @3xl:py-5 @5xl:grid-cols-[1fr_auto_1fr]"
    :class="nav.light ? 'text-white' : 'bg-[color-mix(in_srgb,var(--c-dark)_88%,transparent)] text-[#ece9e3] backdrop-blur'"
  >
    <a :href="`/${nav.locale}`" class="flex items-center gap-3 text-lg leading-none">
      <img v-if="nav.logo" :src="nav.logo" :alt="nav.siteName" class="h-8 w-auto" style="filter: brightness(0) invert(1)" />
      <span v-else class="flex items-baseline">
        <span class="font-extrabold uppercase tracking-tight">{{ name.first }}</span>
        <span v-if="name.mark" class="font-light italic">
          <span class="ms-0.5 bg-primary px-[0.08em] text-dark">{{ name.mark }}</span
          >{{ name.rest }}
        </span>
      </span>
    </a>

    <span v-if="nav.place || time" class="hidden opacity-60 @5xl:block" :class="label">
      <span>{{ nav.place }}</span>
      <span v-if="nav.place && time" class="mx-2 opacity-60">/</span>
      <span v-if="time" class="tabular-nums">{{ time }}</span>
    </span>
    <span v-else class="hidden @5xl:block" />

    <div class="flex items-center justify-end gap-7">
      <nav class="hidden items-center gap-7 @3xl:flex" :class="label">
        <a v-for="(link, i) in nav.links" :key="i" :href="link.href" class="transition-colors hover:text-primary">{{ link.label }}</a>
      </nav>
      <a
        v-for="l in nav.languages"
        :key="l.code"
        :href="l.href"
        :lang="l.code"
        class="hidden opacity-60 hover:opacity-100 @3xl:block"
        :class="label"
        @click="rememberLocale(l.code)"
      >
        {{ l.label }}
      </a>
      <a
        v-if="nav.cta"
        :href="nav.cta.href"
        class="hidden rounded-full bg-primary px-4 py-2.5 text-dark transition hover:brightness-110 @xl:block"
        :class="label"
      >
        {{ nav.cta.label }}
      </a>
      <button type="button" class="text-2xl @3xl:hidden" :aria-label="nav.locale === 'fa' ? 'منو' : 'Menu'" @click="open = true">
        <i class="mdi mdi-menu" />
      </button>
    </div>
  </div>
  <HeaderMenu :nav="nav" :open="open" @close="open = false" />
</template>
