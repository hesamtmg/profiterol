<script setup lang="ts">
/**
 * Copies blocks from the page being edited to another page: pick the blocks, the page, its language and where they go.
 * They are added to that page's draft (as copies with new ids), so nothing changes for visitors until it is published.
 */
import { getBlock, getLocale, locales, type BlockNode } from '@profiterol/blocks';
import type { AdminPage } from '~/composables/useAdminTypes';

const props = defineProps<{
  pageId: string;
  /** The blocks that can be copied: the page's blocks, plus the selected one if it sits inside a column. */
  blocks: BlockNode[];
  /** The blocks ticked when the panel opens. */
  initial: string[];
  locale: string;
}>();
const emit = defineEmits<{ close: []; copied: [page: AdminPage, count: number] }>();
const api = useApi();

const pages = ref<AdminPage[]>([]);
const loading = ref(true);
const busy = ref(false);
const error = ref('');
const search = ref('');
const picked = ref<string[]>([...props.initial]);
const targetId = ref<string | null>(null);
const targetLocale = ref(props.locale);
const position = ref<'start' | 'end'>('end');
const done = ref<{ page: AdminPage; count: number } | null>(null);

const others = computed(() => pages.value.filter((p) => p.id !== props.pageId));
const shown = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return others.value;
  return others.value.filter((p) =>
    [p.name, ...p.translations.flatMap((t) => [t.title, t.slug])].some((s) => s?.toLowerCase().includes(q)),
  );
});
const target = computed(() => others.value.find((p) => p.id === targetId.value) ?? null);
const chosen = computed(() => props.blocks.filter((b) => picked.value.includes(b.id)));
const label = (b: BlockNode) => translate(getBlock(b.type)?.label ?? b.type);
const countIn = (p: AdminPage, code: string) => p.translations.find((t) => t.locale === code)?.blocks.length ?? 0;

function toggleAll() {
  picked.value = picked.value.length === props.blocks.length ? [] : props.blocks.map((b) => b.id);
}

async function copy() {
  if (!target.value || !chosen.value.length) return;
  busy.value = true;
  error.value = '';
  try {
    const page = await api<AdminPage>(`/admin/pages/${target.value.id}/blocks`, {
      method: 'POST',
      body: { locale: targetLocale.value, position: position.value, blocks: chosen.value },
    });
    done.value = { page, count: chosen.value.length };
    emit('copied', page, chosen.value.length);
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  try {
    pages.value = await api<AdminPage[]>('/admin/pages');
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex justify-end bg-slate-900/20" @click.self="emit('close')">
    <aside
      class="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
      role="dialog"
      aria-modal="true"
      :aria-label="$t('Copy to another page')"
      data-testid="copy-to-page"
    >
      <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 class="text-sm font-black">{{ $t('Copy to another page') }}</h2>
          <p class="text-[11px] text-slate-400">{{ $t('The copies go into that page’s draft. Publish it to show them.') }}</p>
        </div>
        <button type="button" class="btn-icon" :title="$t('Close')" @click="emit('close')"><i class="mdi mdi-close text-lg" /></button>
      </div>

      <div v-if="done" class="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <i class="mdi mdi-check-circle-outline text-5xl text-emerald-500" />
        <p class="text-sm">
          {{ $t('Copied {n} blocks to “{page}”.', { n: done.count, page: done.page.name }) }}
        </p>
        <div class="flex gap-2">
          <NuxtLink :to="`/admin/pages/${done.page.id}`" class="btn-light"
            ><i class="mdi mdi-open-in-app" /> {{ $t('Open that page') }}</NuxtLink
          >
          <button type="button" class="btn-dark" @click="emit('close')">{{ $t('Done') }}</button>
        </div>
      </div>

      <template v-else>
        <div class="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <p v-if="error" class="whitespace-pre-line rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{{ error }}</p>

          <section>
            <div class="flex items-center justify-between">
              <h3 class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {{ $t('Blocks to copy ({n})', { n: chosen.length }) }}
              </h3>
              <button type="button" class="text-[11px] text-[#00a998] hover:underline" @click="toggleAll">
                {{ picked.length === blocks.length ? $t('None') : $t('All') }}
              </button>
            </div>
            <ul class="mt-2 max-h-56 space-y-1 overflow-y-auto">
              <li v-for="b in blocks" :key="b.id">
                <label
                  class="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50"
                >
                  <input v-model="picked" type="checkbox" :value="b.id" class="h-3.5 w-3.5 rounded" data-copy-block />
                  <i class="mdi text-base text-slate-500" :class="getBlock(b.type)?.icon" />
                  <span class="flex-1 truncate">{{ label(b) }}</span>
                  <span v-if="b.children" class="text-[10px] text-violet-500">{{ $t('with its blocks') }}</span>
                </label>
              </li>
            </ul>
          </section>

          <section>
            <h3 class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{{ $t('To page') }}</h3>
            <input v-model="search" class="input mt-2 text-xs" :placeholder="$t('Search pages…')" />
            <div v-if="loading" class="mt-2 h-24 animate-pulse rounded-2xl bg-slate-100" />
            <p v-else-if="!others.length" class="mt-2 text-xs text-slate-400">{{ $t('There are no other pages yet.') }}</p>
            <ul v-else class="mt-2 max-h-64 space-y-1 overflow-y-auto">
              <li v-for="p in shown" :key="p.id">
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-start text-xs transition"
                  :class="targetId === p.id ? 'border-sky-400 bg-sky-50' : 'border-slate-200 hover:bg-slate-50'"
                  data-copy-target
                  @click="targetId = p.id"
                >
                  <i class="mdi text-base text-slate-500" :class="p.isHome ? 'mdi-home-outline' : 'mdi-file-document-outline'" />
                  <span class="min-w-0 flex-1 truncate font-medium">{{ p.name }}</span>
                  <span class="shrink-0 text-[10px] text-slate-400">{{ $t('{n} blocks', { n: countIn(p, targetLocale) }) }}</span>
                </button>
              </li>
            </ul>
          </section>

          <section class="grid grid-cols-2 gap-3">
            <div>
              <label class="field-label" for="copy-locale">{{ $t('Language') }}</label>
              <select id="copy-locale" v-model="targetLocale" class="input text-xs">
                <option v-for="l in locales" :key="l.code" :value="l.code">{{ l.label }}</option>
              </select>
            </div>
            <div>
              <label class="field-label" for="copy-position">{{ $t('Put them') }}</label>
              <select id="copy-position" v-model="position" class="input text-xs">
                <option value="end">{{ $t('At the end') }}</option>
                <option value="start">{{ $t('At the top') }}</option>
              </select>
            </div>
          </section>
          <p v-if="targetLocale !== locale" class="text-[11px] leading-relaxed text-amber-700">
            {{ $t('The text stays in {lang}; translate it on that page.', { lang: getLocale(locale)?.label ?? locale }) }}
          </p>
        </div>

        <div class="border-t border-slate-100 px-5 py-4">
          <button type="button" class="btn-dark w-full" :disabled="busy || !target || !chosen.length" @click="copy">
            <i class="mdi mdi-content-copy" />
            {{ busy ? $t('Copying…') : target ? $t('Copy to “{page}”', { page: target.name }) : $t('Pick a page') }}
          </button>
        </div>
      </template>
    </aside>
  </div>
</template>
