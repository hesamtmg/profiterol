<script setup lang="ts">
/**
 * Every public URL under a locale. The path is tried, in order, as:
 * a page (`/en/about-us`), a collection item (`/en/projects/my-project`) and a collection index (`/en/projects`).
 */
import {
  cleanLoader,
  fontFaceCss,
  fontNames,
  getLocale,
  resolveTheme,
  themeToCss,
  type BlockNode,
  type ThemeTokens,
} from '@profiterol/blocks';
import CollectionList from '~/components/blocks/CollectionList.vue';
import ItemDetail from '~/components/site/ItemDetail.vue';
import PageTransition from '~/components/site/PageTransition.vue';
import SectionScroller from '~/components/site/SectionScroller.vue';
import SiteCursor from '~/components/site/SiteCursor.vue';
import SiteLoader from '~/components/site/SiteLoader.vue';
import type { CollectionListData, PublicCollection, PublicItem } from '~/composables/useCollections';
import type { MediaHints } from '~/composables/useMediaHints';

interface PublicPage {
  id: string;
  locale: string;
  title: string;
  slug: string;
  isHome: boolean;
  /** The page's own theme changes, or null to use the site theme. */
  theme: Partial<ThemeTokens> | null;
  seoTitle: string;
  seoDescription: string;
  blocks: BlockNode[];
  alternates: { locale: string; slug: string }[];
}

type Resolved =
  | { kind: 'page'; page: PublicPage }
  | { kind: 'item'; entry: PublicItem }
  | { kind: 'collection'; collection: PublicCollection; list: CollectionListData };

const route = useRoute();
const api = useApi();
const localeDef = getLocale(String(route.params.locale));
if (!localeDef) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
const locale = localeDef.code;
const slug = computed(() => ([] as string[]).concat(route.params.slug ?? []).join('/'));

function isNotFound(err: unknown) {
  const e = err as { statusCode?: number; status?: number };
  return (e?.statusCode ?? e?.status) === 404;
}

async function resolve(): Promise<Resolved | null> {
  try {
    return { kind: 'page', page: await api<PublicPage>(`/public/${locale}/page`, { query: { slug: slug.value } }) };
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
  const segments = slug.value.split('/').filter(Boolean);
  try {
    if (segments.length === 2) {
      const entry = await api<PublicItem>(`/public/${locale}/item`, { query: { collection: segments[0], slug: segments[1] } });
      return { kind: 'item', entry };
    }
    if (segments.length === 1) {
      const collection = await api<PublicCollection>(`/public/${locale}/collection`, { query: { slug: segments[0] } });
      const list = await api<CollectionListData>(`/public/${locale}/items`, { query: { collection: collection.key, limit: 100 } });
      return { kind: 'collection', collection, list };
    }
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
  return null;
}

const { data: settings } = await useSiteSettings();
const { data: resolved, error } = await useAsyncData(() => `route:${locale}:${slug.value}`, resolve);
if (error.value) {
  // The API could not be reached (e.g. it is restarting during an update): answer 503 so search
  // engines retry later instead of treating the page as gone.
  throw createError({ statusCode: 503, statusMessage: 'Temporarily unavailable', fatal: true });
}
if (!resolved.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
}

// Blurred previews and descriptions of the photos on this page, for every <img> (plugins/srcset.ts).
const mediaHints = useMediaHints();
watchEffect(() => {
  const r = resolved.value;
  const media = (x: unknown) => (x as { media?: MediaHints } | null)?.media ?? {};
  mediaHints.value = !r
    ? {}
    : r.kind === 'page'
      ? media(r.page)
      : r.kind === 'item'
        ? media(r.entry)
        : { ...media(r.collection), ...media(r.list) };
});

const siteName = computed(() => settings.value?.siteName?.[locale] ?? settings.value?.siteName?.en ?? '');
// Behind nginx: use the visitor-facing host and protocol (https) for hreflang and og:image links.
const requestUrl = useRequestURL({ xForwardedHost: true, xForwardedProto: true });

/** Links to this same content in every language, for the language switch and hreflang. */
const alternates = computed(() => {
  const r = resolved.value;
  if (!r) return [];
  if (r.kind === 'page') return r.page.alternates;
  if (r.kind === 'item') return r.entry.alternates.map((a) => ({ locale: a.locale, slug: a.path }));
  return r.collection.alternates;
});

const meta = computed(() => {
  const r = resolved.value!;
  if (r.kind === 'page') {
    return {
      title: r.page.isHome ? siteName.value : `${r.page.seoTitle} · ${siteName.value}`,
      description: r.page.seoDescription,
      image: '',
    };
  }
  if (r.kind === 'item') {
    return { title: `${r.entry.item.title} · ${siteName.value}`, description: r.entry.item.seoDescription, image: r.entry.item.cover };
  }
  return { title: `${r.collection.name} · ${siteName.value}`, description: '', image: '' };
});

const loader = computed(() => cleanLoader(settings.value?.loader));

/** Site theme with this page's own changes on top. */
const theme = computed(() =>
  resolveTheme(settings.value?.theme, resolved.value?.kind === 'page' ? resolved.value.page.theme : null, fontNames(settings.value?.fonts)),
);
/** Full-screen heroes get the header floating over them. */
const overlayHeader = computed(() => resolved.value?.kind === 'page' && resolved.value.page.blocks[0]?.type === 'spotlight');
useHead({
  htmlAttrs: { lang: locale, dir: localeDef.dir },
  // html:root outranks the stylesheet's :root defaults, which load after this tag.
  style: [{ innerHTML: () => `${fontFaceCss(settings.value?.fonts)}html:root{${themeToCss(theme.value)}}` }],
  link: [
    // The default fonts are always loaded (nuxt.config); others only when the theme picks them.
    ...(settings.value?.favicon ? [{ rel: 'icon', href: settings.value.favicon }] : []),
    ...alternates.value.map((a) => ({
      rel: 'alternate',
      hreflang: a.locale,
      href: `${requestUrl.origin}/${a.locale}${a.slug ? `/${a.slug}` : ''}`,
    })),
  ],
});

useSeoMeta({
  title: () => meta.value.title,
  description: () => meta.value.description,
  ogTitle: () => meta.value.title,
  ogDescription: () => meta.value.description,
  ogImage: () => (meta.value.image ? new URL(meta.value.image, requestUrl.origin).href : undefined),
  ogSiteName: () => siteName.value,
  ogLocale: locale,
  ogType: () => (resolved.value?.kind === 'item' ? 'article' : 'website'),
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
    <template v-else-if="resolved">
      <SiteLoader v-if="loader.enabled" :loader="loader" :site-name="siteName" :locale="locale" />
      <SiteHeader
        :site-name="siteName"
        :logo="settings?.logo"
        :menu="settings?.menu ?? []"
        :locale="locale"
        :alternates="alternates"
        :overlay="overlayHeader"
        :glass="theme.headerStyle === 'glass'"
      />
      <main>
        <template v-if="resolved.kind === 'page'">
          <BlockView v-for="block in resolved.page.blocks" :key="block.id" :block="block" :locale="locale" />
        </template>

        <ItemDetail v-else-if="resolved.kind === 'item'" :entry="resolved.entry" :locale="locale" />

        <section v-else class="px-3 py-3 @3xl:px-6">
          <div class="panel px-6 py-10 @3xl:px-20 @3xl:py-16">
            <h1 class="text-4xl font-black @3xl:text-6xl">{{ resolved.collection.name }}</h1>
            <div class="mt-8 border-t border-slate-200" />
            <div class="mt-8">
              <CollectionList
                embedded
                :locale="locale"
                :data="resolved.list"
                :p="{
                  title: '',
                  subtitle: '',
                  collection: resolved.collection.key,
                  variant: 'photo',
                  columns: '3',
                  limit: 100,
                  tag: '',
                  showFilters: true,
                  buttonLabel: '',
                }"
              />
            </div>
          </div>
        </section>
      </main>
      <SectionScroller v-if="theme.scrollMode === 'sections' && resolved.kind === 'page'" :locale="locale" />
      <SiteCursor :mode="theme.cursor" />
      <PageTransition :mode="theme.pageTransition" :label="siteName" />
    </template>
  </div>
</template>
