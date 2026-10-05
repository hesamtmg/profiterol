<script setup lang="ts">
/** "New page from a template": a name and one of the starting points. Emits the created page. */
import type { AdminPage } from '~/composables/useAdminTypes';

interface TemplateInfo {
  key: string;
  name: { en: string; fa: string };
  description: { en: string; fa: string };
  icon: string;
}

const props = defineProps<{ initialName?: string }>();
const emit = defineEmits<{ close: []; created: [page: AdminPage] }>();
const api = useApi();
const { lang } = useAdminI18n();
const templates = ref<TemplateInfo[]>([]);
const chosen = ref('about');
const name = ref(props.initialName ?? '');
const busy = ref(false);
const error = ref('');

const typed = ref(Boolean(props.initialName));
const text = (t: { en: string; fa: string }) => (lang.value === 'fa' ? t.fa : t.en);

onMounted(async () => {
  try {
    templates.value = await api<TemplateInfo[]>('/admin/pages/templates');
    const first = templates.value.find((t) => t.key === chosen.value);
    if (!typed.value && first) name.value = text(first.name);
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
});

// The page name follows the template until it is typed in.
watch(chosen, (key) => {
  const t = templates.value.find((x) => x.key === key);
  if (!typed.value && t && key !== 'blank') name.value = text(t.name);
});

async function create() {
  busy.value = true;
  error.value = '';
  try {
    emit('created', await api<AdminPage>('/admin/pages', { method: 'POST', body: { name: name.value.trim(), template: chosen.value } }));
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" @click.self="emit('close')">
    <form
      class="w-full max-w-3xl rounded-[2rem] bg-white p-8 shadow-2xl"
      role="dialog"
      aria-modal="true"
      :aria-label="$t('New page from a template')"
      @submit.prevent="create"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-black">{{ $t('New page from a template') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ $t('Every template comes in English and Persian. Change anything afterwards.') }}</p>
        </div>
        <button type="button" class="btn-icon" :title="$t('Close')" @click="emit('close')"><i class="mdi mdi-close text-lg" /></button>
      </div>
      <div class="mt-6 grid gap-3 sm:grid-cols-3" role="radiogroup">
        <button
          v-for="t in templates"
          :key="t.key"
          type="button"
          role="radio"
          :aria-checked="chosen === t.key"
          class="flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-start transition"
          :class="chosen === t.key ? 'border-[#00a998] bg-emerald-50/50' : 'border-slate-200 hover:border-slate-300'"
          :data-template="t.key"
          @click="chosen = t.key"
        >
          <i class="mdi text-2xl text-[#00a998]" :class="t.icon" />
          <span class="text-sm font-bold">{{ text(t.name) }}</span>
          <span class="text-xs leading-relaxed text-slate-500">{{ text(t.description) }}</span>
        </button>
      </div>
      <div class="mt-6 flex flex-wrap items-end gap-3">
        <div class="min-w-56 flex-1">
          <label class="field-label" for="template-page-name">{{ $t('Page name') }}</label>
          <input id="template-page-name" v-model="name" class="input" required @input="typed = true" />
        </div>
        <button type="submit" class="btn-dark" :disabled="busy || !name.trim()"><i class="mdi mdi-plus" /> {{ $t('Create page') }}</button>
      </div>
      <p v-if="error" class="mt-4 whitespace-pre-line rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
    </form>
  </div>
</template>
