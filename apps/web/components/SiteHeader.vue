<script setup lang="ts">
import { locales } from '@profiterol/blocks';
import type { MenuItem } from '~/composables/useSite';

const props = defineProps<{
  siteName: string;
  logo?: string;
  menu: MenuItem[];
  locale: string;
  /** Links to this page in each language. */
  alternates?: { locale: string; slug: string }[];
}>();

const open = ref(false);

function localeHref(code: string) {
  const alt = props.alternates?.find((a) => a.locale === code);
  return alt?.slug ? `/${code}/${alt.slug}` : `/${code}`;
}
</script>

<template>
  <header class="sticky top-0 z-40 px-3 pt-3 @3xl:px-6">
    <div class="flex items-center justify-between gap-4 rounded-full bg-surface/95 px-5 py-3 shadow-sm backdrop-blur @3xl:px-8">
      <a :href="`/${locale}`" class="flex items-center gap-3">
        <img v-if="logo" :src="logo" :alt="siteName" class="h-9 w-auto" />
        <span class="text-lg font-black tracking-tight">{{ siteName }}</span>
      </a>

      <!-- Hovering one link blurs the others, as in amsr-portfolio. -->
      <nav class="group hidden items-center gap-8 @3xl:flex">
        <a
          v-for="(item, i) in menu"
          :key="i"
          :href="resolveHref(item.href, locale)"
          class="text-sm font-medium transition-all duration-300 group-hover:blur-[1.5px] hover:!blur-none hover:text-primary"
        >
          {{ item.label[locale] ?? item.label.en }}
        </a>
      </nav>

      <div class="flex items-center gap-2">
        <a
          v-for="l in locales.filter((l) => l.code !== locale)"
          :key="l.code"
          :href="localeHref(l.code)"
          class="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium hover:border-primary hover:text-primary"
          :lang="l.code"
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
      <div v-if="open" class="fixed inset-0 z-50 flex flex-col bg-surface p-8">
        <button type="button" class="self-end text-3xl" aria-label="Close" @click="open = false">
          <i class="mdi mdi-close" />
        </button>
        <nav class="mt-10 flex flex-col gap-6">
          <a
            v-for="(item, i) in menu"
            :key="i"
            :href="resolveHref(item.href, locale)"
            class="text-3xl font-black"
            @click="open = false"
          >
            {{ item.label[locale] ?? item.label.en }}
          </a>
        </nav>
      </div>
    </Transition>
  </header>
</template>
