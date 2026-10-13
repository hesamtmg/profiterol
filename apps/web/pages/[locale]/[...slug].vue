<script setup lang="ts">
/**
 * Every public URL under a locale. The path is tried, in order, as:
 * a page (`/en/about-us`), a collection item (`/en/projects/my-project`) and a collection index (`/en/projects`).
 */
import {
  articleJsonLd,
  breadcrumbJsonLd,
  cleanLoader,
  defaultLocale,
  fontFaceCss,
  fontNames,
  getLocale,
  jsonLdScript,
  publicOrigin,
  resolveTheme,
  seoTitle,
  siteJsonLd,
  themeToCss,
  verificationMeta,
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
  /** Picture for link previews chosen in the page settings ('' = the page's first picture). */
  ogImage?: string;
  /** Kept out of search engines. */
  noindex?: boolean;
  publishedAt?: string | null;
  updatedAt?: string;
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
  // An old address (e.g. from before a move) may have a redirect in Admin → Redirects.
  const moved = await api<{ to: string; status: number }>('/public/redirect', { query: { path: route.path } }).catch(() => null);
  if (!moved) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
  await navigateTo(moved.to, { redirectCode: moved.status, external: /^https?:/i.test(moved.to) });
}
// The home page lives at /<locale>; its own slug (e.g. /en/home) would be a second copy of it.
if (resolved.value?.kind === 'page' && resolved.value.page.isHome && slug.value) {
  await navigateTo(`/${locale}`, { redirectCode: 301 });
}
// While the site is closed for maintenance, tell search engines to come back later rather than index the notice.
if (import.meta.server && settings.value?.maintenance) {
  const event = useRequestEvent();
  if (event) {
    setResponseStatus(event, 503, 'Temporarily unavailable');
    setResponseHeader(event, 'Retry-After', '3600');
  }
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
const seo = computed(() => settings.value?.seo ?? {});
// Canonical, hreflang and share links use the site's main address (not www. or another alias), from the API;
// without one, the visitor-facing host and protocol (behind nginx).
const requestUrl = useRequestURL({ xForwardedHost: true, xForwardedProto: true });
const origin = computed(() => publicOrigin(settings.value?.origin, requestUrl));

/** The first picture in a page's blocks (a hero photo, a slide, a poster), for link previews. */
function firstImage(value: unknown): string {
  if (typeof value === 'string') return /^(\/|https:)[^\s]*\.(jpe?g|png|webp|avif|gif)(\?.*)?$/i.test(value) ? value : '';
  if (!value || typeof value !== 'object') return '';
  for (const v of Object.values(value)) {
    const found = firstImage(v);
    if (found) return found;
  }
  return '';
}

// Encoded like the sitemap's addresses, so both name the same URL (Persian slugs included).
const pageUrl = (loc: string, path: string) => `${origin.value}/${loc}${path ? `/${encodeURI(path)}` : ''}`;

/** Links to this same content in every language, for the language switch and hreflang. */
const alternates = computed(() => {
  const r = resolved.value;
  if (!r) return [];
  if (r.kind === 'page') return r.page.alternates;
  if (r.kind === 'item') return r.entry.alternates.map((a) => ({ locale: a.locale, slug: a.path }));
  return r.collection.alternates;
});

/** Title (in the site's pattern), description (else the site's default) and picture for search results and shares. */
const meta = computed(() => {
  const r = resolved.value;
  const title = (t: string) => seoTitle(seo.value, locale, t, siteName.value);
  const fallback = seo.value.description?.[locale] ?? '';
  if (!r) return { title: siteName.value, description: fallback, image: '' };
  if (r.kind === 'page') {
    return {
      title: r.page.isHome ? siteName.value : title(r.page.seoTitle),
      description: r.page.seoDescription || fallback,
      image: r.page.ogImage || firstImage(r.page.blocks.map((b) => [b.props, b.children])),
    };
  }
  if (r.kind === 'item') {
    return { title: title(r.entry.item.title), description: r.entry.item.seoDescription || fallback, image: r.entry.item.cover };
  }
  return { title: title(r.collection.name), description: fallback, image: r.list.items.find((i) => i.cover)?.cover ?? '' };
});

/** Hidden from search engines: the whole site (Settings → SEO, or maintenance), or this page or item. */
const noindex = computed(() => {
  const r = resolved.value;
  return (
    !!settings.value?.maintenance ||
    !!seo.value.hideSite ||
    (r?.kind === 'page' && !!r.page.noindex) ||
    (r?.kind === 'item' && !!r.entry.item.noindex)
  );
});

/** The one address search engines should index for this content: no query string, home at /<locale>. */
const canonical = computed(() => {
  const r = resolved.value;
  if (!r) return '';
  if (r.kind === 'page') return pageUrl(locale, r.page.isHome ? '' : r.page.slug);
  return pageUrl(locale, slug.value);
});
/** Shared links show the page's own picture, else the site's default share picture, else the logo. */
const shareImage = computed(() => {
  const src = meta.value.image || seo.value.shareImage || settings.value?.logo || '';
  return src ? new URL(src, origin.value).href : '';
});

/**
 * Structured data for search engines: on the home page, who runs the site (Admin → Settings → Business) and the
 * site itself; elsewhere a breadcrumb trail, plus an article for collection items.
 */
const structuredData = computed(() => {
  const r = resolved.value;
  if (!r) return [];
  const home = { name: siteName.value, url: pageUrl(locale, '') };
  if (r.kind === 'page' && r.page.isHome) {
    const site = siteJsonLd({
      business: settings.value?.business,
      origin: origin.value,
      homeUrl: home.url,
      name: siteName.value,
      locale,
      logo: settings.value?.logo ? new URL(settings.value.logo, origin.value).href : '',
      description: meta.value.description,
    });
    return site ? [site] : [];
  }
  if (r.kind === 'page') return [breadcrumbJsonLd([home, { name: r.page.title, url: canonical.value }])].filter(Boolean);
  if (r.kind === 'collection') return [breadcrumbJsonLd([home, { name: r.collection.name, url: canonical.value }])].filter(Boolean);
  const { collection, item } = r.entry;
  const blogLike = collection.key === 'blog' || collection.fields.some((f) => f.key === 'author');
  return [
    breadcrumbJsonLd([home, { name: collection.name, url: pageUrl(locale, collection.slug) }, { name: item.title, url: canonical.value }]),
    articleJsonLd({
      type: blogLike ? 'BlogPosting' : 'Article',
      url: canonical.value,
      headline: item.title,
      description: meta.value.description,
      image: shareImage.value,
      locale,
      published: item.publishedAt,
      modified: item.updatedAt,
      author: typeof item.data?.author === 'string' ? item.data.author : '',
      publisher: siteName.value,
      origin: origin.value,
    }),
  ].filter(Boolean);
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
  script: () => structuredData.value.map((data) => ({ type: 'application/ld+json', innerHTML: jsonLdScript(data) })),
  // Search console ownership checks (Admin → Settings → SEO).
  meta: () => verificationMeta(seo.value),
  style: [{ innerHTML: () => `${fontFaceCss(settings.value?.fonts)}html:root{${themeToCss(theme.value)}}` }],
  link: () => [
    // The default fonts are always loaded (nuxt.config); others only when the theme picks them.
    ...(settings.value?.favicon ? [{ rel: 'icon', href: settings.value.favicon }] : []),
    ...(canonical.value ? [{ rel: 'canonical', href: canonical.value }] : []),
    // hreflang only makes sense with more than one language; x-default is where visitors with no match land.
    ...(alternates.value.length > 1
      ? [
          ...alternates.value.map((a) => ({ rel: 'alternate', hreflang: a.locale, href: pageUrl(a.locale, a.slug) })),
          ...alternates.value
            .filter((a) => a.locale === defaultLocale)
            .map((a) => ({ rel: 'alternate', hreflang: 'x-default', href: pageUrl(a.locale, a.slug) })),
        ]
      : []),
  ],
});

useSeoMeta({
  title: () => meta.value.title,
  description: () => meta.value.description,
  ogTitle: () => meta.value.title,
  ogDescription: () => meta.value.description,
  ogImage: () => shareImage.value || undefined,
  ogUrl: () => canonical.value || undefined,
  ogSiteName: () => siteName.value,
  ogLocale: locale,
  ogLocaleAlternate: () => alternates.value.filter((a) => a.locale !== locale).map((a) => a.locale),
  ogType: () => (resolved.value?.kind === 'item' ? 'article' : 'website'),
  articlePublishedTime: () => (resolved.value?.kind === 'item' ? (resolved.value.entry.item.publishedAt ?? undefined) : undefined),
  articleModifiedTime: () => (resolved.value?.kind === 'item' ? resolved.value.entry.item.updatedAt : undefined),
  twitterCard: () => (shareImage.value ? 'summary_large_image' : 'summary'),
  twitterSite: () => (seo.value.twitter ? `@${seo.value.twitter}` : undefined),
  twitterImage: () => shareImage.value || undefined,
  robots: () => (noindex.value ? 'noindex, follow' : 'index, follow, max-image-preview:large'),
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
