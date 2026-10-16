<script setup lang="ts">
/**
 * A link field: type any address, or pick one of the site's pages or collections from a list.
 * With `locale` (a block on a page in that language) a picked page becomes `/<locale>/<slug>`. Without it (the
 * menu, shared by every language) it becomes the bare slug, which the site opens in the visitor's language.
 */
import { locales } from '@profiterol/blocks';
import type { AdminPage } from '~/composables/useAdminTypes';

const props = defineProps<{ id?: string; locale?: string; placeholder?: string }>();
const model = defineModel<string>();

const open = ref(false);
const query = ref('');
const root = ref<HTMLElement | null>(null);
const searchEl = ref<HTMLInputElement | null>(null);

const pages = useState<AdminPage[] | null>('admin-link-pages', () => null);
const { list: collections, load: loadCollections } = useAdminCollections();
const loading = ref(false);
const api = useApi();

async function toggle() {
  open.value = !open.value;
  if (!open.value) return;
  query.value = '';
  nextTick(() => searchEl.value?.focus());
  loading.value = true;
  // Fetched each time the list opens, so pages made or renamed meanwhile show up.
  await Promise.all([
    api<AdminPage[]>('/admin/pages')
      .then((list) => (pages.value = list))
      .catch(() => undefined),
    loadCollections().catch(() => undefined),
  ]);
  loading.value = false;
}

/** The language whose addresses are shown and inserted. */
const lang = computed(() => props.locale ?? locales[0].code);

interface Option {
  key: string;
  label: string;
  href: string;
  icon: string;
  note?: string;
}

const options = computed<Option[]>(() => {
  const l = lang.value;
  const pageOptions = (pages.value ?? []).map((p): Option => {
    const t = p.translations.find((x) => x.locale === l);
    const slug = t?.slug ?? '';
    const href = p.isHome ? (props.locale ? `/${l}` : '/') : props.locale ? `/${l}/${slug}` : slug;
    return {
      key: `p-${p.id}`,
      label: t?.title || p.name,
      href,
      icon: p.isHome ? 'mdi-home-outline' : 'mdi-file-document-outline',
      note: p.status === 'published' ? undefined : translate('Draft'),
    };
  });
  const collectionOptions = (collections.value ?? [])
    .filter((c) => c.slugs?.[l])
    .map((c): Option => ({
      key: `c-${c.key}`,
      label: c.name[l] || c.name.en || c.key,
      href: props.locale ? `/${l}/${c.slugs[l]}` : c.slugs[l],
      icon: 'mdi-folder-multiple-outline',
    }));
  const q = query.value.trim().toLowerCase();
  const all = [...pageOptions, ...collectionOptions].filter((o) => o.href);
  return q ? all.filter((o) => o.label.toLowerCase().includes(q) || o.href.toLowerCase().includes(q)) : all;
});

function pick(o: Option) {
  model.value = o.href;
  open.value = false;
}

function onOutside(e: PointerEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false;
}
onMounted(() => document.addEventListener('pointerdown', onOutside));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside));
</script>

<template>
  <div ref="root" class="relative" @keydown.esc.stop="open = false">
    <div class="flex items-center gap-2">
      <input
        :id="id"
        v-model="model"
        type="text"
        class="input min-w-0 font-mono text-xs"
        dir="ltr"
        :placeholder="placeholder ?? '/page, #anchor or https://…'"
      />
      <button
        type="button"
        class="btn-light shrink-0 !px-3"
        :class="{ '!bg-slate-900 !text-white': open }"
        :title="$t('Choose a page')"
        :aria-expanded="open"
        data-testid="link-pick"
        @click="toggle"
      >
        <i class="mdi mdi-file-link-outline" />
      </button>
    </div>
    <div
      v-if="open"
      class="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      data-testid="link-options"
    >
      <div class="border-b border-slate-100 p-2">
        <input ref="searchEl" v-model="query" type="search" class="input text-xs" :placeholder="$t('Search pages')" />
      </div>
      <ul class="max-h-64 overflow-y-auto py-1" role="listbox">
        <li v-if="loading && !options.length" class="px-3 py-3 text-center text-xs text-slate-400">
          <i class="mdi mdi-loading mdi-spin" /> {{ $t('Loading…') }}
        </li>
        <li v-else-if="!options.length" class="px-3 py-3 text-center text-xs text-slate-400">{{ $t('No pages found') }}</li>
        <li v-for="o in options" :key="o.key" role="option" :aria-selected="model === o.href">
          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-2 text-start text-xs transition hover:bg-slate-50"
            :class="{ 'bg-sky-50': model === o.href }"
            @click="pick(o)"
          >
            <i class="mdi text-base text-slate-400" :class="o.icon" />
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-slate-700">{{ o.label }}</span>
              <span class="block truncate font-mono text-[10px] text-slate-400" dir="ltr">{{ o.href }}</span>
            </span>
            <span v-if="o.note" class="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">{{ o.note }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
