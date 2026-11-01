<script setup lang="ts">
import { cleanSeo, locales, robotsTxt, type FieldDef, type SeoSettings } from '@profiterol/blocks';
import FieldInput from '~/components/admin/FieldInput.vue';

definePageMeta({ layout: 'admin', middleware: 'admin' });

/** What Admin → SEO shows: the settings, and the robots.txt and sitemap search engines get from them. */
interface SeoView {
  seo: Partial<SeoSettings>;
  origin: string;
  /** The site's address also hosts preview sites, which robots.txt keeps out of search engines. */
  previews: boolean;
  /** Nothing is listed: the site is hidden, or it is a preview. */
  hidden: boolean;
  preview: boolean;
  robots: string;
  sitemap: {
    url: string;
    total: number;
    groups: { group: string; count: number; files: number; urls: string[] }[];
    updatedAt: string;
  };
}

const api = useApi();
const { canManageSeo } = useAuth();
if (!canManageSeo.value) await navigateTo('/admin', { replace: true });

const view = ref<SeoView | null>(null);
const seo = ref<SeoSettings | null>(null);
/** The sitemap lists, one address per line while editing. */
const exclude = ref('');
const extra = ref('');
const saving = ref(false);
const refreshing = ref(false);
const message = ref<{ kind: 'ok' | 'error'; text: string } | null>(null);
const openGroups = reactive<Record<string, boolean>>({});

const imageField = (key: string, label: string): FieldDef => ({ key, label, type: 'image' });

function show(v: SeoView) {
  view.value = v;
  const s = cleanSeo(v.seo);
  for (const l of locales) {
    s.titleTemplate[l.code] ??= '';
    s.description[l.code] ??= '';
  }
  seo.value = s;
  exclude.value = s.sitemapExclude.join('\n');
  extra.value = s.sitemapExtra.join('\n');
}

async function load() {
  try {
    show(await api<SeoView>('/admin/seo'));
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  }
}

/** The settings as they would be saved (the lists split into lines). */
const edited = computed<SeoSettings | null>(() =>
  seo.value ? { ...seo.value, sitemapExclude: lines(exclude.value), sitemapExtra: lines(extra.value) } : null,
);
const lines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

/** robots.txt as it will be once saved, updated while typing. */
const robotsPreview = computed(() =>
  edited.value && view.value
    ? robotsTxt(view.value.preview ? { ...cleanSeo(edited.value), hideSite: true } : cleanSeo(edited.value), view.value.origin, {
        previews: view.value.previews,
      })
    : '',
);

/** The robots.txt the automatic mode makes, as a starting point for a custom one. */
const automaticRobots = computed(() =>
  edited.value && view.value
    ? robotsTxt({ ...cleanSeo(edited.value), robotsMode: 'auto', hideSite: false }, view.value.origin).trimEnd()
    : '',
);

/** Lines search engines would not understand (or that could be unsafe) are dropped when saving. */
const dropped = computed(() => {
  if (!edited.value) return { robots: 0, exclude: 0, extra: 0 };
  const clean = cleanSeo(edited.value);
  const field = edited.value.robotsMode === 'custom' ? edited.value.robotsCustom : edited.value.robotsExtra;
  const kept = edited.value.robotsMode === 'custom' ? clean.robotsCustom : clean.robotsExtra;
  return {
    robots: lines(field).length - lines(kept).length,
    exclude: edited.value.sitemapExclude.length - clean.sitemapExclude.length,
    extra: edited.value.sitemapExtra.length - clean.sitemapExtra.length,
  };
});

const unsaved = computed(
  () => !!view.value && !!edited.value && JSON.stringify(cleanSeo(edited.value)) !== JSON.stringify(cleanSeo(view.value.seo)),
);

function generateCustom() {
  if (!seo.value) return;
  if (seo.value.robotsCustom.trim() && !confirm(translate('Replace your robots.txt with the automatic one?'))) return;
  seo.value.robotsCustom = automaticRobots.value;
  seo.value.robotsMode = 'custom';
}

async function save() {
  if (!edited.value) return;
  saving.value = true;
  message.value = null;
  try {
    show(await api<SeoView>('/admin/seo', { method: 'PUT', body: { seo: edited.value } }));
    message.value = { kind: 'ok', text: translate('Saved. The sitemap and robots.txt are up to date.') };
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  } finally {
    saving.value = false;
  }
}

/** Makes the sitemap again from what is published now (it also updates itself on every publish). */
async function regenerate() {
  refreshing.value = true;
  try {
    const v = await api<SeoView>('/admin/seo');
    if (view.value) view.value = { ...view.value, sitemap: v.sitemap, robots: v.robots, hidden: v.hidden };
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  } finally {
    refreshing.value = false;
  }
}

/** Saves a text file on the person's computer. */
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadSitemap() {
  try {
    const xml = await $fetch<string>(view.value!.sitemap.url, { responseType: 'text' });
    download('sitemap.xml', xml, 'application/xml');
  } catch {
    window.open(view.value!.sitemap.url, '_blank', 'noopener');
  }
}

const groupLabel = (g: string) => (g === 'pages' ? translate('Pages') : g === '_extra' ? translate('Added by hand') : g);

onMounted(load);
</script>

<template>
  <div class="space-y-6" data-testid="seo-page">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-3xl font-black">{{ $t('Search engines (SEO)') }}</h1>
        <p class="mt-1 text-sm font-light text-slate-500">
          {{ $t('How this site appears in Google and when shared, and the sitemap and robots.txt search engines read.') }}
        </p>
      </div>
      <button type="button" class="btn-dark" :disabled="saving || !seo" data-testid="seo-save" @click="save">
        {{ $t(saving ? 'Saving…' : 'Save') }}
      </button>
    </div>
    <p
      v-if="message"
      class="whitespace-pre-line rounded-2xl px-4 py-3 text-sm"
      :class="message.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'"
      data-testid="seo-message"
    >
      {{ message.text }}
    </p>
    <p v-if="unsaved" class="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
      {{ $t('You have changes that are not saved yet. The sitemap and robots.txt change when you save.') }}
    </p>
    <p v-if="view?.preview" class="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-700">
      {{ $t('This is a preview site: search engines never index it, whatever is set here. The settings apply once it is a real site.') }}
    </p>

    <template v-if="seo && view">
      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">{{ $t('Titles, descriptions and sharing') }}</h2>
        <p class="mt-1 text-xs text-slate-400">{{ $t('Each page can also have its own title, description and picture.') }}</p>
        <label class="mt-4 flex items-center gap-2 text-sm">
          <input v-model="seo.hideSite" type="checkbox" class="h-4 w-4 rounded" data-testid="seo-hide-site" />
          {{ $t('Hide the whole site from search engines (while it is being built)') }}
        </label>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div v-for="l in locales" :key="`t-${l.code}`">
            <label class="field-label">{{ $t('Title pattern ({lang})', { lang: l.label }) }}</label>
            <input v-model="seo.titleTemplate[l.code]" class="input" :dir="l.dir" placeholder="%s · {site}" maxlength="120" />
            <p class="mt-1 text-[11px] text-slate-400">{{ $t('%s is the page title, {site} the site name.') }}</p>
          </div>
          <div v-for="l in locales" :key="`d-${l.code}`">
            <label class="field-label">{{ $t('Default description ({lang})', { lang: l.label }) }}</label>
            <textarea v-model="seo.description[l.code]" rows="2" class="input" :dir="l.dir" maxlength="300" />
            <p class="mt-1 text-[11px]" :class="(seo.description[l.code] ?? '').length > 160 ? 'text-amber-600' : 'text-slate-400'">
              {{ $t('{n} of about 160 characters', { n: (seo.description[l.code] ?? '').length }) }}
            </p>
          </div>
          <FieldInput v-model="seo.shareImage" :field="imageField('shareImage', $t('Default picture when shared (1200×630)'))" />
          <div>
            <label class="field-label" for="seo-twitter">{{ $t('X (Twitter) account') }}</label>
            <input id="seo-twitter" v-model="seo.twitter" class="input" dir="ltr" placeholder="yoursite" />
          </div>
        </div>
        <h3 class="mt-6 text-sm font-bold">{{ $t('Search console verification') }}</h3>
        <p class="mt-1 text-xs text-slate-400">{{ $t('Paste only the code (content="…") the console gives you.') }}</p>
        <div class="mt-3 grid gap-4 sm:grid-cols-2">
          <div v-for="v in ['google', 'bing', 'yandex', 'baidu'] as const" :key="v">
            <label class="field-label capitalize">{{ v }}</label>
            <input v-model="seo.verification[v]" class="input font-mono text-xs" dir="ltr" />
          </div>
        </div>
      </section>

      <!-- Sitemap -->
      <section class="rounded-[2rem] bg-white p-7 shadow-sm" data-testid="seo-sitemap">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-black">{{ $t('Sitemap') }}</h2>
            <p class="mt-1 text-xs text-slate-400">
              {{ $t('Made from your published pages and collection items, and updated by itself every time you publish.') }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn-light" :disabled="refreshing" data-testid="sitemap-regenerate" @click="regenerate">
              <i class="mdi mdi-refresh" :class="refreshing && 'animate-spin'" /> {{ $t('Generate again') }}
            </button>
            <button type="button" class="btn-light" @click="downloadSitemap"><i class="mdi mdi-download" /> {{ $t('Download') }}</button>
          </div>
        </div>

        <div class="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
          <p class="flex flex-wrap items-center gap-2">
            <i class="mdi mdi-sitemap-outline text-slate-400" />
            <a :href="view.sitemap.url" target="_blank" class="underline" dir="ltr">{{ view.sitemap.url }}</a>
            <span class="text-xs text-slate-500" data-testid="sitemap-total">
              · {{ $t('{n} addresses for search engines', { n: view.sitemap.total }) }}
            </span>
          </p>
          <p v-if="view.hidden" class="mt-2 text-xs text-amber-700">
            {{ $t('The sitemap is empty while the site is hidden from search engines.') }}
          </p>
          <ul v-else class="mt-3 space-y-2">
            <li v-for="g in view.sitemap.groups" :key="g.group">
              <button
                type="button"
                class="flex w-full items-center gap-2 text-start text-xs"
                @click="openGroups[g.group] = !openGroups[g.group]"
              >
                <i class="mdi" :class="openGroups[g.group] ? 'mdi-chevron-down' : 'mdi-chevron-right'" />
                <span class="font-semibold">{{ groupLabel(g.group) }}</span>
                <span class="text-slate-400">{{ $t('{n} addresses', { n: g.count }) }}</span>
              </button>
              <ul v-if="openGroups[g.group]" class="mt-1 max-h-64 space-y-0.5 overflow-auto ps-6 font-mono text-[11px]" dir="ltr">
                <li v-for="u in g.urls" :key="u" class="truncate">
                  <a :href="u" target="_blank" class="text-slate-600 hover:underline">{{ u }}</a>
                </li>
                <li v-if="g.count > g.urls.length" class="text-slate-400">… {{ g.count - g.urls.length }}</li>
              </ul>
            </li>
            <li v-if="!view.sitemap.groups.length" class="text-xs text-slate-500">{{ $t('Nothing is published yet.') }}</li>
          </ul>
        </div>

        <label class="mt-5 flex items-center gap-2 text-sm">
          <input v-model="seo.collectionPages" type="checkbox" class="h-4 w-4 rounded" />
          {{ $t('List collection pages (e.g. /en/projects) in the sitemap') }}
        </label>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label class="field-label" for="sitemap-exclude">{{ $t('Leave out of the sitemap') }}</label>
            <textarea
              id="sitemap-exclude"
              v-model="exclude"
              rows="4"
              class="input font-mono text-xs"
              dir="ltr"
              placeholder="/en/thank-you&#10;/fa/drafts"
              data-testid="sitemap-exclude"
            />
            <p class="mt-1 text-[11px] text-slate-400">{{ $t('One address per line. Everything under an address is left out too.') }}</p>
            <p v-if="dropped.exclude > 0" class="mt-1 text-[11px] text-amber-600">
              {{ $t('{n} lines are not addresses on this site and will be dropped.', { n: dropped.exclude }) }}
            </p>
          </div>
          <div>
            <label class="field-label" for="sitemap-extra">{{ $t('Add to the sitemap') }}</label>
            <textarea
              id="sitemap-extra"
              v-model="extra"
              rows="4"
              class="input font-mono text-xs"
              dir="ltr"
              placeholder="/fa/landing"
              data-testid="sitemap-extra"
            />
            <p class="mt-1 text-[11px] text-slate-400">
              {{ $t('Other addresses on this site, one per line, e.g. pages that are not made in the page editor.') }}
            </p>
            <p v-if="dropped.extra > 0" class="mt-1 text-[11px] text-amber-600">
              {{ $t('{n} lines are not addresses on this site and will be dropped.', { n: dropped.extra }) }}
            </p>
          </div>
        </div>
      </section>

      <!-- robots.txt -->
      <section class="rounded-[2rem] bg-white p-7 shadow-sm" data-testid="seo-robots">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-black">robots.txt</h2>
            <p class="mt-1 text-xs text-slate-400">{{ $t('Tells search engines which parts of the site they may visit.') }}</p>
          </div>
          <button type="button" class="btn-light" @click="download('robots.txt', view.robots, 'text/plain')">
            <i class="mdi mdi-download" /> {{ $t('Download') }}
          </button>
        </div>
        <div class="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1 text-xs sm:inline-flex" role="group">
          <button
            v-for="m in ['auto', 'custom'] as const"
            :key="m"
            type="button"
            class="flex-1 whitespace-nowrap rounded-lg px-3 py-1.5"
            :class="seo.robotsMode === m ? 'bg-white shadow-sm' : 'text-slate-500'"
            :aria-pressed="seo.robotsMode === m"
            :data-testid="`robots-mode-${m}`"
            @click="seo.robotsMode = m"
          >
            {{ $t(m === 'auto' ? 'Made automatically' : 'Write my own') }}
          </button>
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <template v-if="seo.robotsMode === 'auto'">
              <label class="field-label" for="seo-robots">{{ $t('Extra robots.txt lines') }}</label>
              <textarea
                id="seo-robots"
                v-model="seo.robotsExtra"
                rows="8"
                class="input font-mono text-xs"
                dir="ltr"
                placeholder="Disallow: /drafts"
                data-testid="robots-extra"
              />
              <p class="mt-1 text-[11px] text-slate-400">
                {{ $t('Added to the automatic lines, which keep the admin out and point at the sitemap.') }}
              </p>
            </template>
            <template v-else>
              <div class="flex items-center justify-between gap-2">
                <label class="field-label" for="seo-robots-custom">{{ $t('Your robots.txt') }}</label>
                <button type="button" class="text-xs text-slate-600 underline" data-testid="robots-generate" @click="generateCustom">
                  <i class="mdi mdi-auto-fix" /> {{ $t('Start from the automatic one') }}
                </button>
              </div>
              <textarea
                id="seo-robots-custom"
                v-model="seo.robotsCustom"
                rows="12"
                class="input font-mono text-xs"
                dir="ltr"
                :placeholder="automaticRobots"
                data-testid="robots-custom"
              />
              <p class="mt-1 text-[11px] text-slate-400">
                {{ $t('Served as you write it. A Sitemap line for this site is added when yours has none.') }}
              </p>
            </template>
            <p v-if="dropped.robots > 0" class="mt-1 text-[11px] text-amber-600">
              {{
                $t(
                  '{n} lines will be dropped: only comments (#) and User-agent, Disallow, Allow, Crawl-delay, Sitemap, Host and Clean-param lines are kept.',
                  { n: dropped.robots },
                )
              }}
            </p>
            <p v-if="seo.hideSite" class="mt-2 text-xs text-amber-700">
              {{ $t('While the site is hidden, robots.txt keeps every search engine out, whatever is written here.') }}
            </p>
          </div>
          <div>
            <p class="field-label">
              {{ $t('What search engines will get') }}
              · <a :href="`${view.origin}/robots.txt`" target="_blank" class="font-normal underline" dir="ltr">robots.txt</a>
            </p>
            <pre
              class="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-slate-100"
              dir="ltr"
              data-testid="robots-preview"
              >{{ robotsPreview }}</pre>
          </div>
        </div>
      </section>
    </template>
    <div v-else-if="!message" class="h-64 animate-pulse rounded-[2rem] bg-white" />
  </div>
</template>
