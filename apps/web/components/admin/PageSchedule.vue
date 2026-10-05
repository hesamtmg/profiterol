<script setup lang="ts">
/**
 * Publish later / take offline later. Saved straight away (it is not part of the draft): at "go live" the draft as it
 * is then gets published; at "take offline" the page stops being shown.
 */
import type { AdminPage } from '~/composables/useAdminTypes';

const props = defineProps<{ page: AdminPage }>();
const emit = defineEmits<{ updated: [page: AdminPage] }>();
const api = useApi();
const busy = ref(false);
const error = ref('');

/** <input type="datetime-local"> works in local time without a zone: "2026-10-05T14:30". */
function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const publishAt = ref(toLocalInput(props.page.publishAt));
const unpublishAt = ref(toLocalInput(props.page.unpublishAt));
watch(
  () => [props.page.publishAt, props.page.unpublishAt],
  () => {
    publishAt.value = toLocalInput(props.page.publishAt);
    unpublishAt.value = toLocalInput(props.page.unpublishAt);
  },
);

async function store(changes: { publishAt?: string | null; unpublishAt?: string | null }) {
  busy.value = true;
  error.value = '';
  try {
    emit('updated', await api<AdminPage>(`/admin/pages/${props.page.id}`, { method: 'PATCH', body: changes }));
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    busy.value = false;
  }
}

const save = (key: 'publishAt' | 'unpublishAt', local: string) => store({ [key]: local ? new Date(local).toISOString() : null });
const when = (iso: string) => new Date(iso).toLocaleString(adminLocale(), { dateStyle: 'medium', timeStyle: 'short' });
const minNow = computed(() => toLocalInput(new Date().toISOString()));
</script>

<template>
  <div class="rounded-2xl bg-slate-50 p-4" data-schedule>
    <p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{{ $t('Schedule') }}</p>
    <label class="field-label" for="publish-at">{{ $t('Go live at') }}</label>
    <div class="flex gap-1">
      <input
        id="publish-at"
        v-model="publishAt"
        type="datetime-local"
        class="input min-w-0 text-xs"
        :min="minNow"
        :disabled="busy"
        @change="save('publishAt', publishAt)"
      />
      <button v-if="page.publishAt" type="button" class="btn-icon shrink-0" :title="$t('Cancel')" @click="save('publishAt', '')">
        <i class="mdi mdi-close" />
      </button>
    </div>
    <label class="field-label mt-3" for="unpublish-at">{{ $t('Take offline at') }}</label>
    <div class="flex gap-1">
      <input
        id="unpublish-at"
        v-model="unpublishAt"
        type="datetime-local"
        class="input min-w-0 text-xs"
        :min="minNow"
        :disabled="busy"
        @change="save('unpublishAt', unpublishAt)"
      />
      <button v-if="page.unpublishAt" type="button" class="btn-icon shrink-0" :title="$t('Cancel')" @click="save('unpublishAt', '')">
        <i class="mdi mdi-close" />
      </button>
    </div>
    <p v-if="page.publishAt" class="mt-3 text-[11px] text-emerald-700">
      <i class="mdi mdi-clock-outline" /> {{ $t('The draft will be published on {time}, as it is then.', { time: when(page.publishAt) }) }}
    </p>
    <p v-if="page.unpublishAt" class="mt-2 text-[11px] text-amber-700">
      <i class="mdi mdi-clock-outline" /> {{ $t('The page goes offline on {time}.', { time: when(page.unpublishAt) }) }}
    </p>
    <p v-if="error" class="mt-2 whitespace-pre-line text-[11px] text-red-600">{{ error }}</p>
  </div>
</template>
