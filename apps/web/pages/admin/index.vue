<script setup lang="ts">
import { getBlock } from '@profiterol/blocks';
import TemplatePicker from '~/components/admin/TemplatePicker.vue';
import type { AdminPage } from '~/composables/useAdminTypes';

definePageMeta({ layout: 'admin', middleware: 'admin' });

const api = useApi();
const pages = ref<AdminPage[]>([]);
const loading = ref(true);
const error = ref('');
const newName = ref('');
const creating = ref(false);
const picking = ref(false);

async function load() {
  loading.value = true;
  try {
    pages.value = await api<AdminPage[]>('/admin/pages');
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function create() {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    const page = await api<AdminPage>('/admin/pages', { method: 'POST', body: { name: newName.value.trim() } });
    await navigateTo(`/admin/pages/${page.id}`);
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    creating.value = false;
  }
}

async function remove(page: AdminPage) {
  if (!confirm(translate('Delete “{name}”? This cannot be undone.', { name: page.name }))) return;
  try {
    await api(`/admin/pages/${page.id}`, { method: 'DELETE' });
    pages.value = pages.value.filter((p) => p.id !== page.id);
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
}

async function duplicate(page: AdminPage) {
  try {
    const copy = await api<AdminPage>(`/admin/pages/${page.id}/duplicate`, { method: 'POST' });
    pages.value.splice(pages.value.indexOf(page) + 1, 0, copy);
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
}

const when = (iso: string) => new Date(iso).toLocaleString(adminLocale(), { dateStyle: 'medium', timeStyle: 'short' });

function liveUrl(page: AdminPage, locale = 'fa') {
  const t = page.translations.find((x) => x.locale === locale) ?? page.translations[0];
  return page.isHome ? `/${t.locale}` : `/${t.locale}/${t.slug}`;
}

/** The first few block types of the page, shown as a mini preview on the card. */
function outline(page: AdminPage) {
  const t = page.translations.find((x) => x.locale === 'en') ?? page.translations[0];
  return (t?.blocks ?? []).slice(0, 5).map((b) => getBlock(b.type));
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black">{{ $t('Pages') }}</h1>
        <p class="mt-1 text-sm font-light text-slate-500">{{ $t('Every page has a version for each language.') }}</p>
      </div>
      <form class="flex gap-2" @submit.prevent="create">
        <input v-model="newName" class="input w-56" :placeholder="$t('New page name, e.g. About us')" />
        <button type="submit" class="btn-dark" :disabled="creating || !newName.trim()">
          <i class="mdi mdi-plus" /> {{ $t('New page') }}
        </button>
        <button type="button" class="btn-light" @click="picking = true">
          <i class="mdi mdi-view-dashboard-edit-outline" /> {{ $t('From a template') }}
        </button>
      </form>
      <TemplatePicker
        v-if="picking"
        :initial-name="newName.trim()"
        @close="picking = false"
        @created="(p) => navigateTo(`/admin/pages/${p.id}`)"
      />
    </div>

    <p v-if="error" class="mt-6 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>

    <div v-if="loading" class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 3" :key="i" class="h-64 animate-pulse rounded-[2rem] bg-white" />
    </div>

    <div v-else class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="page in pages"
        :key="page.id"
        class="group flex flex-col overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200/60 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300/50"
      >
        <!-- Mini outline of the page's blocks -->
        <NuxtLink :to="`/admin/pages/${page.id}`" class="block bg-[#00a998] p-4">
          <div class="flex h-36 flex-col gap-1.5 overflow-hidden rounded-[1.25rem] bg-[#00a998]">
            <div
              v-for="(def, i) in outline(page)"
              :key="i"
              class="flex flex-1 items-center gap-2 rounded-xl bg-white/95 px-3 text-xs text-slate-500 transition group-hover:bg-white"
            >
              <i class="mdi" :class="def?.icon ?? 'mdi-help'" />
              {{ $t(def?.label ?? 'Unknown block') }}
            </div>
            <div v-if="!outline(page).length" class="flex flex-1 items-center justify-center rounded-xl bg-white/90 text-xs text-slate-400">
              {{ $t('Empty page') }}
            </div>
          </div>
        </NuxtLink>
        <div class="flex flex-1 flex-col p-6">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-black">{{ page.name }}</h2>
            <span v-if="page.isHome" class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{{
              $t('Home')
            }}</span>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span
              class="rounded-full px-2 py-0.5 font-medium"
              :class="page.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
            >
              {{ page.status === 'published' ? $t('Published') : $t('Draft') }}
            </span>
            <span v-for="t in page.translations" :key="t.locale" dir="ltr">/{{ t.locale }}/{{ t.slug }}</span>
          </div>
          <p v-if="page.publishAt" class="mt-2 text-xs text-emerald-700">
            <i class="mdi mdi-clock-outline" /> {{ $t('Goes live {time}', { time: when(page.publishAt) }) }}
          </p>
          <p v-if="page.unpublishAt" class="mt-1 text-xs text-amber-700">
            <i class="mdi mdi-clock-outline" /> {{ $t('Goes offline {time}', { time: when(page.unpublishAt) }) }}
          </p>
          <div class="mt-auto flex items-center gap-2 pt-6">
            <NuxtLink :to="`/admin/pages/${page.id}`" class="btn-dark"><i class="mdi mdi-pencil-outline" /> {{ $t('Edit') }}</NuxtLink>
            <a v-if="page.status === 'published'" :href="liveUrl(page)" target="_blank" class="btn-light">
              <i class="mdi mdi-open-in-new" /> {{ $t('View') }}
            </a>
            <button type="button" class="btn-icon ms-auto" :title="$t('Duplicate')" @click="duplicate(page)">
              <i class="mdi mdi-content-copy text-lg" />
            </button>
            <button type="button" class="btn-icon hover:!text-red-600" :title="$t('Delete')" @click="remove(page)">
              <i class="mdi mdi-trash-can-outline text-lg" />
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
