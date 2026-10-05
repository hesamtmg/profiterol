<script setup lang="ts">
/** Whole-site templates in Site settings: a theme plus a set of draft pages and menu links. */
interface SiteTemplateInfo {
  key: string;
  name: { en: string; fa: string };
  description: { en: string; fa: string };
  theme: string;
  pages: { en: string; fa: string }[];
}

const emit = defineEmits<{ applied: [] }>();
const api = useApi();
const { lang } = useAdminI18n();
const templates = ref<SiteTemplateInfo[]>([]);
const busy = ref('');
const result = ref<{ name: string; pages: { id: string; name: string }[] } | null>(null);
const error = ref('');
const text = (t: { en: string; fa: string }) => (lang.value === 'fa' ? t.fa : t.en);

onMounted(async () => {
  templates.value = await api<SiteTemplateInfo[]>('/admin/site-templates').catch(() => []);
});

async function apply(t: SiteTemplateInfo) {
  const ok = confirm(
    translate(
      'Use “{name}”? It sets the site theme and adds {n} draft pages with menu links. Your pages stay as they are; nothing goes live until you publish.',
      {
        name: text(t.name),
        n: t.pages.length,
      },
    ),
  );
  if (!ok) return;
  busy.value = t.key;
  error.value = '';
  try {
    const res = await api<{ pages: { id: string; name: string }[] }>(`/admin/site-templates/${t.key}/apply`, { method: 'POST' });
    result.value = { name: text(t.name), pages: res.pages };
    emit('applied');
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    busy.value = '';
  }
}
</script>

<template>
  <section class="rounded-[2rem] bg-white p-7 shadow-sm" data-site-templates>
    <h2 class="font-black">{{ $t('Site templates') }}</h2>
    <p class="mt-1 text-xs text-slate-500">{{ $t('Start a whole site: a theme, ready-made pages in both languages, and menu links.') }}</p>
    <div class="mt-5 grid gap-4 md:grid-cols-2">
      <div v-for="t in templates" :key="t.key" class="flex flex-col rounded-2xl border border-slate-200 p-5" :data-template="t.key">
        <h3 class="font-bold">{{ text(t.name) }}</h3>
        <p class="mt-1 flex-1 text-xs leading-relaxed text-slate-500">{{ text(t.description) }}</p>
        <p class="mt-3 text-[11px] text-slate-400">{{ t.pages.map(text).join(' · ') }}</p>
        <button type="button" class="btn-light mt-4 self-start" :disabled="busy !== ''" @click="apply(t)">
          {{ busy === t.key ? $t('Adding…') : $t('Use this template') }}
        </button>
      </div>
    </div>
    <div v-if="result" class="mt-5 rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-900" role="status">
      <p class="font-semibold">{{ $t('Added the “{name}” pages as drafts:', { name: result.name }) }}</p>
      <ul class="mt-2 flex flex-wrap gap-2">
        <li v-for="p in result.pages" :key="p.id">
          <NuxtLink :to="`/admin/pages/${p.id}`" class="btn-light !py-1.5 text-xs">{{ p.name }}</NuxtLink>
        </li>
      </ul>
      <p class="mt-3 text-xs">{{ $t('Open the new Home page, tick “Use as home page” and publish when it is ready.') }}</p>
    </div>
    <p v-if="error" class="mt-4 whitespace-pre-line rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
  </section>
</template>
