<script setup lang="ts">
import { locales, type HeaderSettings, type ThemeHeaderStyle } from '@profiterol/blocks';
import type { Component } from 'vue';
import type { MenuItem } from '~/composables/useSite';
import CenteredHeader from './site/header/CenteredHeader.vue';
import ClockHeader from './site/header/ClockHeader.vue';
import DockHeader from './site/header/DockHeader.vue';
import MinimalHeader from './site/header/MinimalHeader.vue';
import StudioHeader from './site/header/StudioHeader.vue';
import { networkName, rememberLocale, type HeaderNav } from './site/header/nav';

const props = defineProps<{
  siteName: string;
  logo?: string;
  menu: MenuItem[];
  locale: string;
  /** Links to this page in each language. */
  alternates?: { locale: string; slug: string }[];
  /** Float over the first block instead of sitting above it (used above full-screen heroes). */
  overlay?: boolean;
  /** The theme's header style. */
  variant?: ThemeHeaderStyle;
  /** The header button (Site settings → Menu and header). */
  header?: Partial<HeaderSettings>;
  /** The site's email and profile links (Site settings → Business), shown in the full-screen menu. */
  email?: string;
  social?: string[];
  /** In the editor's canvas. */
  preview?: boolean;
}>();

const designs: Partial<Record<ThemeHeaderStyle, Component>> = {
  studio: StudioHeader,
  centered: CenteredHeader,
  minimal: MinimalHeader,
  dock: DockHeader,
  clock: ClockHeader,
};
const design = computed(() => designs[props.variant ?? 'solid']);

// The solid bar turns to glass when it floats over a photo.
const isGlass = computed(() => props.overlay || props.variant === 'glass');

const open = ref(false);

function localeHref(code: string) {
  const alt = props.alternates?.find((a) => a.locale === code);
  return alt?.slug ? `/${code}/${alt.slug}` : `/${code}`;
}

const cta = computed(() => {
  const label = props.header?.ctaLabel?.[props.locale]?.trim();
  return label ? { label, href: resolveHref(props.header?.ctaLink ?? '', props.locale) } : null;
});

const nav = computed<HeaderNav>(() => ({
  siteName: props.siteName,
  logo: props.logo,
  locale: props.locale,
  links: props.menu.map((item) => ({ label: item.label[props.locale] ?? item.label.en ?? '', href: resolveHref(item.href, props.locale) })),
  cta: cta.value,
  languages: locales.filter((l) => l.code !== props.locale).map((l) => ({ code: l.code, label: l.label, href: localeHref(l.code) })),
  light: Boolean(props.overlay),
  preview: Boolean(props.preview),
  email: props.email ?? '',
  social: (props.social ?? []).map((href) => ({ href, label: networkName(href) })),
  place: props.header?.place?.[props.locale]?.trim() ?? '',
  timeZone: props.header?.timeZone ?? '',
}));
</script>

<template>
  <header
    v-if="design"
    class="z-40"
    :class="[
      variant === 'dock' ? '' : variant === 'clock' ? 'top-0' : 'top-0 px-3 pt-3 @3xl:px-6',
      variant === 'dock' ? 'relative' : overlay ? 'absolute inset-x-0' : variant === 'studio' ? 'relative' : 'sticky',
    ]"
  >
    <component :is="design" :nav="nav" />
  </header>

  <header v-else class="top-0 z-40 px-3 pt-3 @3xl:px-6" :class="overlay ? 'absolute inset-x-0 @5xl:px-28 @5xl:pt-6' : 'sticky'">
    <div
      class="flex items-center justify-between gap-4 rounded-full px-5 py-3 @3xl:px-8"
      :class="
        isGlass ? 'glass text-white @3xl:py-4' : 'bg-[color-mix(in_srgb,var(--c-surface)_92%,transparent)] text-ink shadow-sm backdrop-blur'
      "
    >
      <a :href="`/${locale}`" class="flex items-center gap-3">
        <img v-if="logo" :src="logo" :alt="siteName" class="h-9 w-auto" :style="isGlass ? 'filter: brightness(0) invert(1)' : ''" />
        <span class="text-lg font-black tracking-tight">{{ siteName }}</span>
      </a>

      <!-- Hovering one link blurs the others, as in amsr-portfolio. -->
      <nav class="group hidden items-center gap-8 @3xl:flex">
        <a
          v-for="(item, i) in menu"
          :key="i"
          :href="resolveHref(item.href, locale)"
          class="text-sm font-medium transition-all duration-300 group-hover:blur-[1.5px] hover:!blur-none"
          :class="isGlass ? 'tracking-wide' : 'hover:text-primary'"
        >
          {{ item.label[locale] ?? item.label.en }}
        </a>
      </nav>

      <div class="flex items-center gap-2">
        <a
          v-if="cta"
          :href="cta.href"
          class="hidden rounded-[var(--radius-button)] px-4 py-1.5 text-sm font-semibold transition hover:scale-105 @3xl:block"
          :class="isGlass ? 'bg-white text-dark' : 'bg-primary text-white'"
        >
          {{ cta.label }}
        </a>
        <a
          v-for="l in locales.filter((l) => l.code !== locale)"
          :key="l.code"
          :href="localeHref(l.code)"
          class="rounded-full border px-3 py-1 text-xs font-medium"
          :class="isGlass ? 'border-white/40 hover:bg-white/15' : 'border-slate-200 hover:border-primary hover:text-primary'"
          :lang="l.code"
          @click="rememberLocale(l.code)"
        >
          {{ l.label }}
        </a>
        <button type="button" class="text-2xl @3xl:hidden" aria-label="Menu" @click="open = true">
          <i class="mdi mdi-menu" />
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <Transition
      enter-active-class="transition-opacity duration-500"
      leave-active-class="transition-opacity duration-500"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 flex flex-col bg-surface p-8 text-ink">
        <button type="button" class="self-end text-3xl" aria-label="Close" @click="open = false">
          <i class="mdi mdi-close" />
        </button>
        <nav class="mt-10 flex flex-col gap-6">
          <a v-for="(item, i) in menu" :key="i" :href="resolveHref(item.href, locale)" class="text-3xl font-black" @click="open = false">
            {{ item.label[locale] ?? item.label.en }}
          </a>
          <a v-if="cta" :href="cta.href" class="text-3xl font-black text-primary" @click="open = false">{{ cta.label }}</a>
        </nav>
      </div>
    </Transition>
  </header>
</template>
