<script setup lang="ts">
import { getLocale, themeToCss, type BlockNode } from '@profiterol/blocks';

interface PublicPage {
  id: string;
  locale: string;
  title: string;
  slug: string;
  isHome: boolean;
  seoTitle: string;
  seoDescription: string;
  blocks: BlockNode[];
  alternates: { locale: string; slug: string }[];
}

const route = useRoute();
const api = useApi();
const localeDef = getLocale(String(route.params.locale));
if (!localeDef) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
const locale = localeDef.code;
const slug = computed(() => ([] as string[]).concat(route.params.slug ?? []).join('/'));

const { data: settings } = await useSiteSettings();
const { data: page, error } = await useAsyncData(
  () => `page:${locale}:${slug.value}`,
  () => api<PublicPage>(`/public/${locale}/page`, { query: { slug: slug.value } }),
);
if (error.value || !page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
}

const siteName = computed(() => settings.value?.siteName?.[locale] ?? settings.value?.siteName?.en ?? '');
const requestUrl = useRequestURL();

useHead({
  htmlAttrs: { lang: locale, dir: localeDef.dir },
  style: [{ innerHTML: `:root{${themeToCss(settings.value?.theme ?? {})}}` }],
  link: [
    ...(settings.value?.favicon ? [{ rel: 'icon', href: settings.value.favicon }] : []),
    ...(page.value?.alternates ?? []).map((a) => ({
      rel: 'alternate',
      hreflang: a.locale,
      href: `${requestUrl.origin}/${a.locale}${a.slug ? `/${a.slug}` : ''}`,
    })),
  ],
});

useSeoMeta({
  title: () => (page.value?.isHome ? siteName.value : `${page.value?.seoTitle} · ${siteName.value}`),
  description: () => page.value?.seoDescription,
  ogTitle: () => page.value?.seoTitle,
  ogDescription: () => page.value?.seoDescription,
  ogSiteName: () => siteName.value,
  ogLocale: locale,
  ogType: 'website',
});
</script>

<template>
  <div class="site @container min-h-screen pb-3" :dir="localeDef!.dir" :lang="locale">
    <template v-if="settings?.maintenance">
      <div class="flex min-h-screen items-center justify-center p-6">
        <div class="panel max-w-xl p-12 text-center">
          <h1 class="text-3xl font-black">{{ siteName }}</h1>
          <p class="mt-4 font-extralight text-muted">{{ settings.maintenanceText?.[locale] }}</p>
        </div>
      </div>
    </template>
    <template v-else>
      <SiteHeader
        :site-name="siteName"
        :logo="settings?.logo"
        :menu="settings?.menu ?? []"
        :locale="locale"
        :alternates="page?.alternates"
      />
      <main>
        <BlockView v-for="block in page?.blocks ?? []" :key="block.id" :block="block" :locale="locale" />
      </main>
    </template>
  </div>
</template>
