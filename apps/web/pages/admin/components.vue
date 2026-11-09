<script setup lang="ts">
/**
 * Admin → Components (owners only): a preview of every built-in block, and which sites may use each one. A block
 * on "Every site" is in every site's editor, new sites included; one on "Only chosen sites" is in the editors of the
 * ticked sites only. Pages that already have a block keep showing it when it is taken away from their site; it just
 * cannot be added again there.
 */
import {
  blocks as blockDefs,
  designBlockTypes,
  fontFaceCss,
  fontNames,
  getLocale,
  locales,
  resolveTheme,
  themeToCss,
  type BlockCategory,
  type BlockDef,
} from '@profiterol/blocks';
import ComponentPreview from '~/components/admin/ComponentPreview.vue';
import type { SiteSettings } from '~/composables/useSite';

definePageMeta({ layout: 'admin', middleware: 'admin' });

interface SiteRow {
  id: string;
  name: string;
  primary: string;
  url: string;
  preview: boolean;
  previewSlug: string | null;
  printDesigner: boolean;
  current?: boolean;
}
interface AccessData {
  /** Restricted blocks: type → the sites allowed. Blocks not listed are on every site. */
  rules: Record<string, string[]>;
  /** site id → block type → how many pages (per language) use it. */
  usage: Record<string, Record<string, number>>;
}
type Change = { type: string; siteIds: string[] | null };

const api = useApi();
const { isOwner } = useAuth();
const { t } = useAdminI18n();

const sites = ref<SiteRow[]>([]);
const access = ref<AccessData>({ rules: {}, usage: {} });
const settings = ref<SiteSettings | null>(null);
const loading = ref(true);
const error = ref('');
const savedAt = ref(0);
const saving = ref(false);

const view = ref<'components' | 'sites'>('components');
const search = ref('');
const category = ref<BlockCategory | ''>('');
const filter = ref<'all' | 'everywhere' | 'limited'>('all');
// The blocks' sample content is written in English, so previews start in it.
const previewLocale = ref(locales.find((l) => l.code === 'en')?.code ?? locales[0].code);
const previewDir = computed(() => (getLocale(previewLocale.value)?.dir ?? 'ltr') as 'ltr' | 'rtl');
const showPreviews = ref(true);
const focusedSite = ref('');
/** The block open in the large preview, and the device it is shown on. */
const opened = ref<BlockDef | null>(null);
const device = ref<'desktop' | 'tablet' | 'mobile'>('desktop');
const deviceWidth = { desktop: 1280, tablet: 820, mobile: 390 } as const;
const devices = [
  { key: 'desktop', label: 'Desktop', icon: 'mdi-monitor' },
  { key: 'tablet', label: 'Tablet', icon: 'mdi-tablet' },
  { key: 'mobile', label: 'Mobile', icon: 'mdi-cellphone' },
] as const;
const views = [
  { key: 'components', label: 'By component', icon: 'mdi-view-grid-outline' },
  { key: 'sites', label: 'By site', icon: 'mdi-web' },
] as const;

const categories: { key: BlockCategory; label: string }[] = [
  { key: 'layout', label: 'Layout' },
  { key: 'animated', label: 'Animated' },
  { key: 'studio', label: 'Studio (bold agency look)' },
  { key: 'folio', label: 'Folio (dark developer portfolio)' },
  { key: 'spatial', label: 'Spatial (shapes and giant letters)' },
  { key: 'atelier', label: 'Atelier (warm workshop look)' },
  { key: 'hero', label: 'Hero' },
  { key: 'cards', label: 'Cards' },
  { key: 'content', label: 'Content' },
  { key: 'media', label: 'Media' },
  { key: 'contact', label: 'Contact' },
  { key: 'classic', label: 'Classic sections (minicms)' },
];
const categoryLabel = (key: BlockCategory) => categories.find((c) => c.key === key)?.label ?? key;

const themeCss = computed(() => themeToCss(resolveTheme(settings.value?.theme, null, fontNames(settings.value?.fonts))));
useHead(() => ({ style: [{ innerHTML: fontFaceCss(settings.value?.fonts) }] }));

const siteLabel = (s: SiteRow) => s.name || s.primary || s.previewSlug || s.id.slice(0, 8);
const siteAddress = (s: SiteRow) => s.url.replace(/^https?:\/\//, '');

const isLimited = (type: string) => type in access.value.rules;
const allowed = (type: string, siteId: string) => !isLimited(type) || access.value.rules[type]!.includes(siteId);
const usedOn = (type: string, siteId: string) => access.value.usage[siteId]?.[type] ?? 0;
const sitesUsing = (type: string) => sites.value.filter((s) => usedOn(type, s.id) > 0);
const allowedCount = (type: string) => (isLimited(type) ? access.value.rules[type]!.length : sites.value.length);

const shown = computed(() => {
  const q = search.value.trim().toLowerCase();
  return blockDefs.filter(
    (b) =>
      (!category.value || b.category === category.value) &&
      (filter.value === 'all' || (filter.value === 'limited') === isLimited(b.type)) &&
      (!q || [b.label, t(b.label), b.type, b.description, t(b.description)].some((x) => x.toLowerCase().includes(q))),
  );
});
const grouped = computed(() =>
  categories.map((c) => ({ ...c, blocks: shown.value.filter((b) => b.category === c.key) })).filter((g) => g.blocks.length),
);
const limitedTotal = computed(() => blockDefs.filter((b) => isLimited(b.type)).length);
const focused = computed(() => sites.value.find((s) => s.id === focusedSite.value) ?? null);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [overview, data, s] = await Promise.all([
      api<{ sites: SiteRow[] }>('/admin/sites'),
      api<AccessData>('/admin/block-access'),
      api<SiteSettings>('/public/settings'),
    ]);
    sites.value = overview.sites;
    access.value = data;
    settings.value = s;
    if (!focusedSite.value) focusedSite.value = (overview.sites.find((x) => x.current) ?? overview.sites[0])?.id ?? '';
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function save(changes: Change[]) {
  if (!changes.length) return;
  saving.value = true;
  error.value = '';
  try {
    access.value = await api<AccessData>('/admin/block-access', { method: 'PUT', body: { changes } });
    savedAt.value = Date.now();
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    saving.value = false;
  }
}

/**
 * Every site, or only chosen ones. Limiting starts with the sites whose pages use the block, so their editors keep
 * it; untick them to take it away.
 */
function setMode(type: string, mode: 'all' | 'chosen') {
  if (mode === 'all') return save([{ type, siteIds: null }]);
  return save([{ type, siteIds: sitesUsing(type).map((s) => s.id) }]);
}

/** The sites allowed a block after turning it on or off for one site. */
function withSite(type: string, siteId: string, on: boolean): string[] {
  const now = isLimited(type) ? access.value.rules[type]! : sites.value.map((s) => s.id);
  return on ? [...new Set([...now, siteId])] : now.filter((id) => id !== siteId);
}

function toggle(type: string, siteId: string, on: boolean) {
  return save([{ type, siteIds: withSite(type, siteId, on) }]);
}

/** In "By site": give this site every block shown, or none of them. */
function setAllFor(siteId: string, on: boolean) {
  const changes = shown.value
    .filter((b) => allowed(b.type, siteId) !== on)
    .map((b) => ({ type: b.type, siteIds: withSite(b.type, siteId, on) }));
  if (
    !on &&
    changes.some((c) => usedOn(c.type, siteId)) &&
    !confirm(t('Some of these blocks are on this site’s pages. Those pages keep them, but they cannot be added again. Continue?'))
  )
    return;
  return save(changes);
}

function toggleForFocused(type: string, on: boolean) {
  if (!focused.value) return;
  return toggle(type, focused.value.id, on);
}

const savedRecently = ref(false);
let savedTimer: ReturnType<typeof setTimeout> | undefined;
watch(savedAt, () => {
  savedRecently.value = true;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => (savedRecently.value = false), 2000);
});

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') opened.value = null;
}
onMounted(() => {
  load();
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div data-testid="components-page">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">{{ $t('Components') }}</h1>
        <p class="mt-1 max-w-2xl text-sm text-slate-500">
          {{
            $t(
              'A preview of every block in the editor. Choose which sites may use each one: a block on “Only chosen sites” is in the editor of the sites you tick, and no other.',
            )
          }}
        </p>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <span v-if="saving" class="text-slate-400"><i class="mdi mdi-loading mdi-spin" /> {{ $t('Saving…') }}</span>
        <span v-else-if="savedRecently" class="text-emerald-600" data-testid="access-saved"
          ><i class="mdi mdi-check" /> {{ $t('Saved') }}</span
        >
      </div>
    </div>

    <p v-if="!isOwner" class="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{{ $t('Only owners can manage components.') }}</p>

    <template v-else>
      <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{{ error }}</p>

      <!-- Toolbar -->
      <div class="sticky top-0 z-20 -mx-5 mt-6 border-b border-slate-200 bg-slate-50/95 px-5 py-3 backdrop-blur">
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex rounded-full bg-white p-1 ring-1 ring-slate-200">
            <button
              v-for="v in views"
              :key="v.key"
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition"
              :class="view === v.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'"
              :data-testid="`view-${v.key}`"
              @click="view = v.key"
            >
              <i class="mdi" :class="v.icon" /> {{ $t(v.label) }}
            </button>
          </div>
          <div class="relative min-w-48 flex-1">
            <i class="mdi mdi-magnify pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input v-model="search" type="search" class="input ps-9" :placeholder="$t('Search blocks')" data-testid="component-search" />
          </div>
          <select v-model="category" class="input w-auto" :aria-label="$t('Category')">
            <option value="">{{ $t('All categories') }}</option>
            <option v-for="c in categories" :key="c.key" :value="c.key">{{ $t(c.label) }}</option>
          </select>
          <select v-model="filter" class="input w-auto" :aria-label="$t('Access')" data-testid="access-filter">
            <option value="all">{{ $t('All blocks') }}</option>
            <option value="everywhere">{{ $t('On every site') }}</option>
            <option value="limited">{{ $t('Only on chosen sites ({n})', { n: limitedTotal }) }}</option>
          </select>
          <select v-model="previewLocale" class="input w-auto" :aria-label="$t('Preview language')">
            <option v-for="l in locales" :key="l.code" :value="l.code">{{ l.label }}</option>
          </select>
          <label class="flex items-center gap-2 px-1 text-sm text-slate-600">
            <input v-model="showPreviews" type="checkbox" class="h-4 w-4 rounded" /> {{ $t('Previews') }}
          </label>
        </div>
        <div v-if="view === 'sites'" class="mt-3 flex flex-wrap items-center gap-2">
          <select v-model="focusedSite" class="input w-auto min-w-64" :aria-label="$t('Site')" data-testid="focused-site">
            <option v-for="s in sites" :key="s.id" :value="s.id">
              {{ siteLabel(s) }} — {{ siteAddress(s) }}{{ s.preview ? ` (${$t('preview')})` : '' }}
            </option>
          </select>
          <button type="button" class="btn-light" :disabled="saving" data-testid="allow-all" @click="setAllFor(focusedSite, true)">
            <i class="mdi mdi-check-all" /> {{ $t('Allow every block shown') }}
          </button>
          <button type="button" class="btn-light" :disabled="saving" data-testid="allow-none" @click="setAllFor(focusedSite, false)">
            <i class="mdi mdi-close" /> {{ $t('Allow none of them') }}
          </button>
          <span v-if="focused" class="text-xs text-slate-500">
            {{
              $t('{n} of {total} blocks allowed', {
                n: blockDefs.filter((b) => allowed(b.type, focused!.id)).length,
                total: blockDefs.length,
              })
            }}
          </span>
        </div>
      </div>

      <div v-if="loading" class="py-20 text-center text-sm text-slate-400"><i class="mdi mdi-loading mdi-spin" /> {{ $t('Loading…') }}</div>
      <p v-else-if="!grouped.length" class="py-20 text-center text-sm text-slate-400">{{ $t('No blocks match.') }}</p>

      <section v-for="g in grouped" v-else :key="g.key" class="mt-8">
        <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          {{ $t(g.label) }} <span class="rounded-full bg-slate-200 px-2 text-xs font-normal text-slate-600">{{ g.blocks.length }}</span>
        </h2>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="b in g.blocks"
            :key="b.type"
            class="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            :class="view === 'sites' && focused && !allowed(b.type, focused.id) ? 'opacity-60' : ''"
            :data-testid="`component-${b.type}`"
          >
            <button
              v-if="showPreviews"
              type="button"
              class="group relative block border-b border-slate-100 text-start"
              :title="$t('Open a larger preview')"
              @click="opened = b"
            >
              <ComponentPreview :type="b.type" :theme-css="themeCss" :locale="previewLocale" :dir="previewDir" :max-height="220" />
              <span
                class="absolute end-2 top-2 rounded-full bg-slate-900/70 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100"
              >
                <i class="mdi mdi-arrow-expand" /> {{ $t('Larger') }}
              </span>
            </button>

            <div class="flex flex-1 flex-col gap-3 p-4">
              <div class="flex items-start gap-3">
                <i class="mdi mt-0.5 text-xl text-slate-500" :class="b.icon" />
                <div class="min-w-0 flex-1">
                  <h3 class="font-medium text-slate-900">{{ $t(b.label) }}</h3>
                  <p class="font-mono text-[11px] text-slate-400" dir="ltr">{{ b.type }}</p>
                  <p class="mt-1 line-clamp-2 text-xs text-slate-500" :title="$t(b.description)">{{ $t(b.description) }}</p>
                </div>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  :class="isLimited(b.type) ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'"
                >
                  {{ isLimited(b.type) ? $t('{n} of {total} sites', { n: allowedCount(b.type), total: sites.length }) : $t('Every site') }}
                </span>
              </div>

              <p v-if="designBlockTypes.includes(b.type)" class="rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-sky-800">
                {{ $t('Also needs “Allow the sublimation designer and Print orders” in Admin → Sites.') }}
              </p>

              <!-- By site: one switch for the chosen site. -->
              <label
                v-if="view === 'sites' && focused"
                class="mt-auto flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"
              >
                <span>
                  {{ $t('Allowed on {site}', { site: siteLabel(focused) }) }}
                  <span v-if="usedOn(b.type, focused.id)" class="block text-[11px] text-slate-500">
                    {{ $t('Used on {n} pages there', { n: usedOn(b.type, focused.id) }) }}
                  </span>
                </span>
                <input
                  type="checkbox"
                  class="h-5 w-5 rounded"
                  :checked="allowed(b.type, focused.id)"
                  :disabled="saving"
                  data-testid="site-block-allowed"
                  @change="toggleForFocused(b.type, ($event.target as HTMLInputElement).checked)"
                />
              </label>

              <!-- By component: every site or only some. -->
              <div v-else class="mt-auto space-y-2">
                <div class="flex rounded-xl bg-slate-100 p-1 text-xs">
                  <button
                    type="button"
                    class="flex-1 rounded-lg px-2 py-1.5 transition"
                    :class="!isLimited(b.type) ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-500'"
                    :disabled="saving"
                    data-testid="mode-all"
                    @click="isLimited(b.type) && setMode(b.type, 'all')"
                  >
                    {{ $t('Every site') }}
                  </button>
                  <button
                    type="button"
                    class="flex-1 rounded-lg px-2 py-1.5 transition"
                    :class="isLimited(b.type) ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-500'"
                    :disabled="saving"
                    data-testid="mode-chosen"
                    @click="!isLimited(b.type) && setMode(b.type, 'chosen')"
                  >
                    {{ $t('Only chosen sites') }}
                  </button>
                </div>
                <ul v-if="isLimited(b.type)" class="max-h-44 space-y-1 overflow-y-auto pe-1" data-testid="site-list">
                  <li v-for="s in sites" :key="s.id">
                    <label class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded"
                        :checked="allowed(b.type, s.id)"
                        :disabled="saving"
                        :data-testid="`allow-${b.type}-${s.id}`"
                        @change="toggle(b.type, s.id, ($event.target as HTMLInputElement).checked)"
                      />
                      <span class="min-w-0 flex-1 truncate">
                        {{ siteLabel(s) }}
                        <span class="text-xs text-slate-400" dir="ltr">{{ siteAddress(s) }}</span>
                      </span>
                      <span v-if="s.preview" class="rounded bg-violet-100 px-1.5 text-[10px] text-violet-700">{{ $t('preview') }}</span>
                      <span
                        v-if="usedOn(b.type, s.id)"
                        class="text-[10px] text-slate-500"
                        :title="$t('Pages there that use it keep it even when it is not allowed.')"
                      >
                        {{ $t('in use') }}
                      </span>
                    </label>
                  </li>
                  <li v-if="!sites.length" class="px-2 text-xs text-slate-400">{{ $t('No sites yet.') }}</li>
                </ul>
                <p v-else-if="sitesUsing(b.type).length" class="text-[11px] text-slate-500">
                  {{ $t('In use on {n} sites.', { n: sitesUsing(b.type).length }) }}
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <p class="mt-10 rounded-2xl bg-slate-100 p-4 text-xs leading-relaxed text-slate-600">
        {{
          $t(
            'A block taken away from a site leaves its editor and cannot be added there again. Pages that already use it keep showing it, so nothing live breaks. New sites get the blocks on “Every site” only. Custom blocks built with AI belong to the site that made them and are managed in its block builder.',
          )
        }}
      </p>
    </template>

    <!-- Large preview -->
    <div
      v-if="opened"
      class="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/50 p-2 md:p-8"
      role="dialog"
      aria-modal="true"
      @click.self="opened = null"
    >
      <div class="flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
          <i class="mdi text-xl text-slate-500" :class="opened.icon" />
          <div class="min-w-0 flex-1">
            <h2 class="font-medium text-slate-900">{{ $t(opened.label) }}</h2>
            <p class="text-xs text-slate-500">{{ $t(categoryLabel(opened.category)) }}</p>
          </div>
          <div class="flex rounded-full bg-slate-100 p-1">
            <button
              v-for="d in devices"
              :key="d.key"
              type="button"
              class="btn-icon h-7 w-7"
              :class="device === d.key ? 'bg-white text-slate-900 shadow-sm' : ''"
              :title="$t(d.label)"
              @click="device = d.key"
            >
              <i class="mdi" :class="d.icon" />
            </button>
          </div>
          <button type="button" class="btn-icon" :title="$t('Close')" @click="opened = null"><i class="mdi mdi-close text-lg" /></button>
        </div>
        <div class="flex-1 overflow-y-auto bg-slate-100 p-4">
          <div class="mx-auto overflow-hidden rounded-xl shadow-lg" :style="{ maxWidth: `${deviceWidth[device]}px` }">
            <ComponentPreview
              :key="`${opened.type}-${device}-${previewLocale}`"
              :type="opened.type"
              :theme-css="themeCss"
              :locale="previewLocale"
              :dir="previewDir"
              :width="deviceWidth[device]"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
