<script setup lang="ts">
import { locales } from '@profiterol/blocks';
import type { AdminCollection } from '~/composables/useCollections';

definePageMeta({ layout: 'admin', middleware: 'admin' });

const api = useApi();
const { user } = useAuth();
const { load } = useAdminCollections();
const collections = ref<AdminCollection[]>([]);
const loading = ref(true);
const error = ref('');
const creating = ref(false);
const showForm = ref(false);

const form = reactive({
  key: '',
  name: Object.fromEntries(locales.map((l) => [l.code, ''])) as Record<string, string>,
  slugs: Object.fromEntries(locales.map((l) => [l.code, ''])) as Record<string, string>,
});

function slugify(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}‌]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

// Suggest the key and addresses from the names until the user edits them.
watch(
  () => ({ ...form.name }),
  (name, old) => {
    const en = name.en ?? '';
    if (!form.key || form.key === slugify(old?.en ?? '').replace(/[^a-z0-9-]/g, '')) {
      form.key = slugify(en).replace(/[^a-z0-9-]/g, '');
    }
    for (const l of locales) {
      if (!form.slugs[l.code] || form.slugs[l.code] === slugify(old?.[l.code] ?? '')) form.slugs[l.code] = slugify(name[l.code] ?? '');
    }
  },
);

async function refresh() {
  loading.value = true;
  try {
    collections.value = await load(true);
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function create() {
  creating.value = true;
  error.value = '';
  try {
    const c = await api<AdminCollection>('/admin/collections', { method: 'POST', body: { ...form, fields: [] } });
    await load(true);
    await navigateTo(`/admin/collections/${c.id}`);
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    creating.value = false;
  }
}

onMounted(refresh);
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black">{{ $t('Collections') }}</h1>
        <p class="mt-1 text-sm font-light text-slate-500">
          {{ $t('Content that repeats, like projects, blog posts or team members. Show it on any page with the “Collection list” block.') }}
        </p>
      </div>
      <button v-if="user?.role === 'admin'" type="button" class="btn-dark" @click="showForm = !showForm">
        <i class="mdi mdi-plus" /> {{ $t('New collection') }}
      </button>
    </div>

    <form v-if="showForm" class="mt-6 rounded-[2rem] bg-white p-7 shadow-sm" @submit.prevent="create">
      <h2 class="font-black">{{ $t('New collection') }}</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <div v-for="l in locales" :key="l.code">
          <label class="field-label" :for="`name-${l.code}`">{{ $t('Name ({lang})', { lang: l.label }) }}</label>
          <input
            :id="`name-${l.code}`"
            v-model="form.name[l.code]"
            class="input"
            :dir="l.dir"
            :placeholder="l.code === 'fa' ? 'تیم' : 'Team'"
            required
          />
        </div>
        <div v-for="l in locales" :key="`s-${l.code}`">
          <label class="field-label" :for="`slug-${l.code}`">{{ $t('Address ({lang})', { lang: l.label }) }}</label>
          <div class="flex items-center gap-1 text-xs text-slate-400" dir="ltr">
            <span class="shrink-0 whitespace-nowrap">/{{ l.code }}/</span
            ><input :id="`slug-${l.code}`" v-model="form.slugs[l.code]" class="input text-xs" required />
          </div>
        </div>
        <div>
          <label class="field-label" for="key">{{ $t('Key (used by blocks; cannot be changed later)') }}</label>
          <input id="key" v-model="form.key" class="input font-mono text-xs" dir="ltr" required pattern="[a-z][a-z0-9\-]{1,39}" />
        </div>
      </div>
      <div class="mt-6 flex gap-2">
        <button type="submit" class="btn-dark" :disabled="creating">{{ $t(creating ? 'Creating…' : 'Create collection') }}</button>
        <button type="button" class="btn-light" @click="showForm = false">{{ $t('Cancel') }}</button>
      </div>
    </form>

    <p v-if="error" class="mt-6 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>

    <div v-if="loading" class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 3" :key="i" class="h-48 animate-pulse rounded-[2rem] bg-white" />
    </div>
    <div v-else class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="(c, i) in collections"
        :key="c.id"
        :to="`/admin/collections/${c.id}`"
        class="group flex flex-col overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200/60 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300/50"
      >
        <div class="flex items-end justify-between p-6 text-white" :class="i % 2 ? 'bg-[#c49a6c]' : 'bg-[#00a998]'">
          <span class="text-5xl font-black">{{ c.itemCount ?? 0 }}</span>
          <span class="text-sm opacity-80">{{ c.itemCount === 1 ? 'item' : 'items' }}</span>
        </div>
        <div class="flex flex-1 flex-col p-6">
          <h2 class="text-lg font-black">{{ c.name.en || c.key }}</h2>
          <p class="text-sm text-slate-500" dir="rtl">{{ c.name.fa }}</p>
          <div class="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span v-for="l in locales" :key="l.code" dir="ltr">/{{ l.code }}/{{ c.slugs[l.code] }}</span>
          </div>
          <p class="mt-3 text-xs text-slate-400">
            {{ c.fields.length }} custom {{ c.fields.length === 1 ? 'field' : 'fields'
            }}<span v-if="c.fields.length">: {{ c.fields.map((f) => f.label).join(', ') }}</span>
          </p>
        </div>
      </NuxtLink>
    </div>
    <p v-if="!loading && !collections.length" class="mt-16 text-center text-sm text-slate-400">{{ $t('No collections yet.') }}</p>
  </div>
</template>
