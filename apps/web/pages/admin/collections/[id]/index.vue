<script setup lang="ts">
import { cleanFieldDef, locales, type FieldDef, type FieldType } from '@profiterol/blocks';
import type { AdminCollection, AdminItem } from '~/composables/useCollections';

definePageMeta({ layout: 'admin', middleware: 'admin' });

const route = useRoute();
const api = useApi();
const { user } = useAuth();
const { load: reloadCollections } = useAdminCollections();
const id = String(route.params.id);

const collection = ref<AdminCollection | null>(null);
const items = ref<AdminItem[]>([]);
const tab = ref<'items' | 'settings'>('items');
const filter = ref<'all' | 'published' | 'draft'>('all');
const newTitle = ref('');
const busy = ref(false);
const message = ref<{ kind: 'ok' | 'error'; text: string } | null>(null);

/** Editable copy of the settings tab. */
const draft = ref<{ name: Record<string, string>; slugs: Record<string, string>; fields: FieldDef[] } | null>(null);

const typeOptions: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'url', label: 'Link' },
  { value: 'image', label: 'Image' },
  { value: 'list', label: 'Image gallery' },
  { value: 'video', label: 'Video' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes / no' },
  { value: 'color', label: 'Color' },
];

const visible = computed(() => items.value.filter((i) => filter.value === 'all' || i.status === filter.value));

function title(item: AdminItem, locale = 'en') {
  return item.translations.find((t) => t.locale === locale)?.title || item.translations[0]?.title || 'Untitled';
}

async function load() {
  try {
    const [c, list] = await Promise.all([
      api<AdminCollection>(`/admin/collections/${id}`),
      api<AdminItem[]>(`/admin/collections/${id}/items`),
    ]);
    collection.value = c;
    items.value = list;
    draft.value = JSON.parse(JSON.stringify({ name: c.name, slugs: c.slugs, fields: c.fields }));
    for (const f of draft.value!.fields) f.labels ??= {};
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  }
}

async function createItem() {
  if (!newTitle.value.trim()) return;
  busy.value = true;
  try {
    const item = await api<AdminItem>(`/admin/collections/${id}/items`, { method: 'POST', body: { title: newTitle.value.trim() } });
    await navigateTo(`/admin/collections/${id}/items/${item.id}`);
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  } finally {
    busy.value = false;
  }
}

function addField() {
  draft.value!.fields.push({ key: '', label: '', type: 'text', labels: {} });
}

function keyFor(label: string) {
  const words = label.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  return words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join('');
}

/** New fields get a key from their label; saved fields keep theirs so existing values still match. */
function onLabel(f: FieldDef & { _new?: boolean }) {
  const saved = collection.value?.fields.some((x) => x.key === f.key);
  if (!saved) f.key = keyFor(f.label);
}

function moveField(i: number, delta: number) {
  const list = draft.value!.fields;
  const [f] = list.splice(i, 1);
  list.splice(i + delta, 0, f);
}

async function saveSettings() {
  busy.value = true;
  message.value = null;
  try {
    collection.value = await api<AdminCollection>(`/admin/collections/${id}`, {
      method: 'PATCH',
      body: {
        name: draft.value!.name,
        slugs: draft.value!.slugs,
        fields: draft.value!.fields.map((f) => cleanFieldDef(f)),
      },
    });
    await reloadCollections(true);
    message.value = { kind: 'ok', text: 'Collection saved' };
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  } finally {
    busy.value = false;
  }
}

async function removeCollection() {
  if (!confirm(`Delete “${collection.value?.name.en}” and all ${items.value.length} of its items? This cannot be undone.`)) return;
  await api(`/admin/collections/${id}`, { method: 'DELETE' });
  await reloadCollections(true);
  await navigateTo('/admin/collections');
}

onMounted(load);
</script>

<template>
  <div v-if="collection">
    <NuxtLink to="/admin/collections" class="text-sm text-slate-500 hover:text-slate-900"><i class="mdi mdi-arrow-left" /> Collections</NuxtLink>
    <div class="mt-3 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black">{{ collection.name.en || collection.key }}</h1>
        <p class="mt-1 font-mono text-xs text-slate-400">
          <span v-for="l in locales" :key="l.code" class="me-3">/{{ l.code }}/{{ collection.slugs[l.code] }}/…</span>
        </p>
      </div>
      <div class="flex gap-2">
        <a :href="`/en/${collection.slugs.en}`" target="_blank" class="btn-light"><i class="mdi mdi-open-in-new" /> View on site</a>
      </div>
    </div>

    <div class="mt-6 flex gap-1">
      <button
        v-for="t in (['items', 'settings'] as const)"
        :key="t"
        type="button"
        class="rounded-full px-4 py-2 text-sm transition"
        :class="tab === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'"
        @click="tab = t"
      >
        {{ t === 'items' ? `Items (${items.length})` : 'Fields & settings' }}
      </button>
    </div>

    <p
      v-if="message"
      class="mt-6 whitespace-pre-line rounded-2xl px-4 py-3 text-sm"
      :class="message.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'"
    >
      {{ message.text }}
    </p>

    <!-- Items -->
    <template v-if="tab === 'items'">
      <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div class="flex rounded-full bg-white p-1 text-xs shadow-sm">
          <button
            v-for="f in (['all', 'published', 'draft'] as const)"
            :key="f"
            type="button"
            class="rounded-full px-3 py-1.5 capitalize transition"
            :class="filter === f ? 'bg-slate-900 text-white' : 'text-slate-500'"
            @click="filter = f"
          >
            {{ f === 'draft' ? 'Drafts' : f }}
          </button>
        </div>
        <form class="flex gap-2" @submit.prevent="createItem">
          <input v-model="newTitle" class="input w-60" placeholder="New item title" aria-label="New item title" />
          <button type="submit" class="btn-dark" :disabled="busy || !newTitle.trim()"><i class="mdi mdi-plus" /> Add item</button>
        </form>
      </div>

      <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="(item, i) in visible"
          :key="item.id"
          :to="`/admin/collections/${id}/items/${item.id}`"
          class="group overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200/60 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300/50"
        >
          <div class="aspect-[16/10] overflow-hidden">
            <img v-if="item.cover" :src="item.cover" alt="" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div
              v-else
              class="flex h-full items-end bg-gradient-to-br p-5 text-4xl font-black text-white/80"
              :class="i % 2 ? 'from-[#c49a6c] to-[#231f20]' : 'from-[#00a998] to-[#c49a6c]'"
            >
              {{ title(item)[0] }}
            </div>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                :class="item.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
              >
                {{ item.status === 'published' ? 'Published' : 'Draft' }}
              </span>
              <span class="text-[11px] text-slate-400">Updated {{ new Date(item.updatedAt).toLocaleDateString() }}</span>
            </div>
            <h2 class="mt-2 font-black">{{ title(item, 'en') }}</h2>
            <p class="text-sm text-slate-500" dir="rtl">{{ title(item, 'fa') }}</p>
          </div>
        </NuxtLink>
      </div>
      <p v-if="!visible.length" class="mt-16 text-center text-sm text-slate-400">No items here yet. Add one above.</p>
    </template>

    <!-- Settings -->
    <template v-else-if="draft">
      <section class="mt-6 rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">Name and address</h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <div v-for="l in locales" :key="l.code">
            <label class="field-label" :for="`cn-${l.code}`">Name ({{ l.label }})</label>
            <input :id="`cn-${l.code}`" v-model="draft.name[l.code]" class="input" :dir="l.dir" />
          </div>
          <div v-for="l in locales" :key="`cs-${l.code}`">
            <label class="field-label" :for="`cs-${l.code}`">Address ({{ l.label }})</label>
            <div class="flex items-center gap-1 text-xs text-slate-400" dir="ltr">
              <span class="shrink-0 whitespace-nowrap">/{{ l.code }}/</span><input :id="`cs-${l.code}`" v-model="draft.slugs[l.code]" class="input font-mono text-xs" />
            </div>
          </div>
        </div>
      </section>

      <section class="mt-6 rounded-[2rem] bg-white p-7 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-black">Custom fields</h2>
            <p class="text-xs text-slate-400">Every item already has a title, address, summary, story, tags and cover image.</p>
          </div>
          <button type="button" class="btn-light" @click="addField"><i class="mdi mdi-plus" /> Add field</button>
        </div>
        <div class="mt-5 space-y-3">
          <div
            v-for="(f, i) in draft.fields"
            :key="i"
            class="grid items-end gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_1fr_10rem_9rem_auto]"
          >
            <div>
              <label class="field-label" :for="`fl-${i}`">Label</label>
              <input :id="`fl-${i}`" v-model="f.label" class="input" placeholder="Client" @input="onLabel(f)" />
            </div>
            <div>
              <label class="field-label" :for="`ffa-${i}`">Label on Persian pages</label>
              <input :id="`ffa-${i}`" v-model="f.labels!.fa" class="input" dir="rtl" placeholder="کارفرما" />
            </div>
            <div>
              <label class="field-label" :for="`ft-${i}`">Type</label>
              <select :id="`ft-${i}`" v-model="f.type" class="input">
                <option v-for="o in typeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>
            <div>
              <label class="field-label" :for="`fk-${i}`">Key</label>
              <input :id="`fk-${i}`" v-model="f.key" class="input font-mono text-xs" dir="ltr" />
            </div>
            <div class="flex gap-1 pb-0.5">
              <button type="button" class="btn-icon" title="Move up" :disabled="i === 0" @click="moveField(i, -1)"><i class="mdi mdi-arrow-up" /></button>
              <button type="button" class="btn-icon" title="Move down" :disabled="i === draft.fields.length - 1" @click="moveField(i, 1)"><i class="mdi mdi-arrow-down" /></button>
              <button type="button" class="btn-icon hover:!text-red-600" title="Remove" @click="draft.fields.splice(i, 1)"><i class="mdi mdi-close" /></button>
            </div>
          </div>
          <p v-if="!draft.fields.length" class="py-6 text-center text-sm text-slate-400">No custom fields.</p>
        </div>
        <p class="mt-4 text-xs text-slate-400">Removing a field hides its values; they are deleted from an item the next time it is saved.</p>
      </section>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <button v-if="user?.role === 'admin'" type="button" class="btn-dark" :disabled="busy" @click="saveSettings">
          {{ busy ? 'Saving…' : 'Save collection' }}
        </button>
        <span v-else class="text-sm text-slate-400">Only admins can change collection settings.</span>
        <button v-if="user?.role === 'admin'" type="button" class="btn-light ms-auto !text-red-600" @click="removeCollection">
          <i class="mdi mdi-trash-can-outline" /> Delete collection
        </button>
      </div>
    </template>
  </div>
</template>
