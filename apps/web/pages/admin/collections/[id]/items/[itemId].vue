<script setup lang="ts">
import { getLocale, locales, themeToCss, type FieldDef } from '@profiterol/blocks';
import FieldInput from '~/components/admin/FieldInput.vue';
import CardItem from '~/components/site/CardItem.vue';
import type { AdminCollection, AdminItem, AdminItemTranslation } from '~/composables/useCollections';
import type { SiteSettings } from '~/composables/useSite';

definePageMeta({ layout: 'admin', middleware: 'admin' });

const route = useRoute();
const api = useApi();
const cid = String(route.params.id);
const iid = String(route.params.itemId);

const collection = ref<AdminCollection | null>(null);
const item = ref<AdminItem | null>(null);
const theme = ref('');
const locale = ref(locales[0].code);
const cover = ref('');
const drafts = reactive<Record<string, AdminItemTranslation>>({});
const saved = ref('');
const busy = ref(false);
const message = ref<{ kind: 'ok' | 'error'; text: string } | null>(null);

const current = computed(() => drafts[locale.value]);
const dir = computed(() => getLocale(locale.value)?.dir ?? 'ltr');
const snapshot = () => JSON.stringify({ cover: cover.value, drafts });
const dirty = computed(() => saved.value !== '' && snapshot() !== saved.value);

const coverField: FieldDef = { key: 'cover', label: 'Cover image', type: 'image' };

/** Tags are edited as comma-separated text. */
const tagsText = computed({
  get: () => current.value?.tags.join(', ') ?? '',
  set: (v: string) => {
    current.value.tags = v.split(/[,،]/).map((t) => t.trim()).filter(Boolean);
  },
});

function fromItem(i: AdminItem) {
  item.value = i;
  cover.value = i.cover;
  for (const l of locales) {
    const t = i.translations.find((x) => x.locale === l.code);
    const data: Record<string, unknown> = {};
    for (const f of collection.value?.fields ?? []) data[f.key] = t?.data?.[f.key] ?? (f.type === 'list' ? [] : f.type === 'number' ? 0 : f.type === 'boolean' ? false : '');
    drafts[l.code] = {
      locale: l.code,
      title: t?.title ?? '',
      slug: t?.slug ?? '',
      excerpt: t?.excerpt ?? '',
      body: t?.body ?? '',
      tags: [...(t?.tags ?? [])],
      data,
      seoDescription: t?.seoDescription ?? '',
    };
  }
  saved.value = snapshot();
}

async function load() {
  try {
    const [c, i, s] = await Promise.all([
      api<AdminCollection>(`/admin/collections/${cid}`),
      api<AdminItem>(`/admin/collections/${cid}/items/${iid}`),
      api<SiteSettings>('/public/settings'),
    ]);
    collection.value = c;
    theme.value = themeToCss(s.theme ?? {});
    fromItem(i);
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  }
}

async function save() {
  busy.value = true;
  message.value = null;
  try {
    const updated = await api<AdminItem>(`/admin/collections/${cid}/items/${iid}`, {
      method: 'PATCH',
      body: { cover: cover.value, translations: locales.map((l) => drafts[l.code]) },
    });
    fromItem(updated);
    message.value = { kind: 'ok', text: 'Saved' };
    return true;
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
    return false;
  } finally {
    busy.value = false;
  }
}

async function setPublished(publish: boolean) {
  if (dirty.value && !(await save())) return;
  try {
    const updated = await api<AdminItem>(`/admin/collections/${cid}/items/${iid}/${publish ? 'publish' : 'unpublish'}`, { method: 'POST' });
    item.value = updated;
    message.value = { kind: 'ok', text: publish ? 'Published' : 'Moved back to drafts' };
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  }
}

async function remove() {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  await api(`/admin/collections/${cid}/items/${iid}`, { method: 'DELETE' });
  saved.value = snapshot();
  await navigateTo(`/admin/collections/${cid}`);
}

/** Copies the custom field values (not the text) from another language, e.g. galleries and links. */
function copyFieldsFrom(code: string) {
  current.value.data = JSON.parse(JSON.stringify(drafts[code].data));
}

const liveUrl = computed(() => `/${locale.value}/${collection.value?.slugs[locale.value]}/${current.value?.slug}`);

function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save();
  }
}
function beforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value) e.preventDefault();
}
onBeforeRouteLeave(() => (dirty.value ? confirm('You have unsaved changes. Leave anyway?') : true));
onMounted(() => {
  load();
  window.addEventListener('keydown', onKey);
  window.addEventListener('beforeunload', beforeUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('beforeunload', beforeUnload);
});
</script>

<template>
  <div v-if="collection && item && current">
    <NuxtLink :to="`/admin/collections/${cid}`" class="text-sm text-slate-500 hover:text-slate-900">
      <i class="mdi mdi-arrow-left" /> {{ collection.name.en || collection.key }}
    </NuxtLink>

    <div class="mt-3 flex flex-wrap items-center gap-3">
      <h1 class="min-w-0 flex-1 truncate text-3xl font-black">{{ drafts.en?.title || current.title || 'Untitled' }}</h1>
      <span
        class="rounded-full px-3 py-1 text-xs font-medium"
        :class="item.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'"
      >
        {{ item.status === 'published' ? 'Published' : 'Draft' }}
      </span>
      <span class="text-xs text-slate-400">{{ busy ? 'Saving…' : dirty ? 'Unsaved changes' : 'All changes saved' }}</span>
      <a v-if="item.status === 'published'" :href="liveUrl" target="_blank" class="btn-light"><i class="mdi mdi-open-in-new" /> View</a>
      <button type="button" class="btn-light" :disabled="busy || !dirty" @click="save">Save</button>
      <button
        v-if="item.status !== 'published'"
        type="button"
        class="btn-dark !bg-[#00a998] hover:!brightness-110"
        :disabled="busy"
        @click="setPublished(true)"
      >
        <i class="mdi mdi-rocket-launch-outline" /> Publish
      </button>
      <button v-else type="button" class="btn-light" :disabled="busy" @click="setPublished(false)">Unpublish</button>
    </div>
    <p v-if="item.status === 'published'" class="mt-2 text-xs text-slate-400">Saved changes to a published item go live straight away.</p>

    <p
      v-if="message"
      class="mt-4 whitespace-pre-line rounded-2xl px-4 py-3 text-sm"
      :class="message.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'"
    >
      {{ message.text }}
    </p>

    <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
      <!-- Text per language -->
      <section class="min-w-0 rounded-[2rem] bg-white p-7 shadow-sm">
        <div class="flex rounded-full bg-slate-100 p-1 text-xs" role="tablist" aria-label="Language">
          <button
            v-for="l in locales"
            :key="l.code"
            type="button"
            class="flex-1 rounded-full py-1.5 font-medium transition"
            :class="locale === l.code ? 'bg-white shadow-sm' : 'text-slate-500'"
            @click="locale = l.code"
          >
            {{ l.label }}
          </button>
        </div>

        <div class="mt-6 space-y-5">
          <div>
            <label class="field-label" for="title">Title</label>
            <input id="title" v-model="current.title" class="input !text-base !font-bold" :dir="dir" />
          </div>
          <div>
            <label class="field-label" for="slug">Address</label>
            <div class="flex items-center gap-1 text-xs text-slate-400" dir="ltr">
              <span class="shrink-0 whitespace-nowrap">/{{ locale }}/{{ collection.slugs[locale] }}/</span><input id="slug" v-model="current.slug" class="input font-mono text-xs" />
            </div>
          </div>
          <div>
            <label class="field-label" for="excerpt">Summary (shown on cards)</label>
            <textarea id="excerpt" v-model="current.excerpt" rows="2" class="input" :dir="dir" />
          </div>
          <div>
            <label class="field-label" for="body">Story (separate paragraphs with a blank line)</label>
            <textarea id="body" v-model="current.body" rows="10" class="input leading-relaxed" :dir="dir" />
          </div>
          <div>
            <label class="field-label" for="tags">Tags (comma-separated; used for filters)</label>
            <input id="tags" v-model.lazy="tagsText" class="input" :dir="dir" placeholder="Branding, Website" />
          </div>

          <div v-if="collection.fields.length" class="space-y-4 rounded-2xl bg-slate-50 p-5">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-black">{{ collection.name.en }} details</h2>
              <button
                v-for="l in locales.filter((x) => x.code !== locale)"
                :key="l.code"
                type="button"
                class="text-xs text-slate-500 hover:text-slate-900"
                @click="copyFieldsFrom(l.code)"
              >
                <i class="mdi mdi-content-duplicate" /> Copy from {{ l.label }}
              </button>
            </div>
            <FieldInput
              v-for="f in collection.fields"
              :key="`${locale}-${f.key}`"
              v-model="current.data[f.key]"
              :field="f"
              :dir="dir"
            />
          </div>

          <div>
            <label class="field-label" for="seo">SEO description (defaults to the summary)</label>
            <textarea id="seo" v-model="current.seoDescription" rows="2" class="input" :dir="dir" />
          </div>
        </div>
      </section>

      <!-- Cover + preview -->
      <aside class="space-y-6">
        <section class="rounded-[2rem] bg-white p-7 shadow-sm">
          <FieldInput v-model="cover" :field="coverField" />
          <p class="mt-2 text-[11px] text-slate-400">Shared by every language.</p>
        </section>

        <section class="rounded-[2rem] bg-white p-5 shadow-sm">
          <p class="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Card preview</p>
          <div class="site @container rounded-[1.5rem] p-3" :style="theme" :dir="dir" :lang="locale">
            <div class="pointer-events-none">
              <CardItem
                variant="photo"
                :index="0"
                :title="current.title"
                :text="current.excerpt"
                :image="cover"
                :tags="current.tags"
                :date="item.publishedAt"
                :locale="locale"
              />
            </div>
          </div>
        </section>

        <button type="button" class="btn-light w-full !text-red-600" @click="remove"><i class="mdi mdi-trash-can-outline" /> Delete item</button>
      </aside>
    </div>
  </div>
  <p v-else-if="message" class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{{ message.text }}</p>
</template>
