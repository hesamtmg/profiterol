<script setup lang="ts">
/** Saved versions of a page, newest first. Restoring puts a version back into the draft; it can be undone the same way. */
import type { AdminPage } from '~/composables/useAdminTypes';

interface Revision {
  id: string;
  kind: 'save' | 'publish' | 'restore';
  author: string;
  createdAt: string;
  updatedAt: string;
  blocks: Record<string, number>;
  titles: Record<string, string>;
}

const props = defineProps<{ pageId: string; locale: string; beforeRestore: () => Promise<boolean> }>();
const emit = defineEmits<{ close: []; restored: [page: AdminPage, when: string] }>();
const api = useApi();
const revisions = ref<Revision[]>([]);
const loading = ref(true);
const busy = ref<string | null>(null);
const error = ref('');

async function refresh() {
  loading.value = true;
  try {
    revisions.value = await api<Revision[]>(`/admin/pages/${props.pageId}/revisions`);
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

const time = (iso: string) => new Date(iso).toLocaleString(adminLocale(), { dateStyle: 'medium', timeStyle: 'short' });
const KIND = { save: 'Edited', publish: 'Published', restore: 'Restored an earlier version' } as const;
const ICON = { save: 'mdi-pencil-outline', publish: 'mdi-rocket-launch-outline', restore: 'mdi-history' } as const;

async function restore(r: Revision) {
  if (
    !confirm(
      translate('Put the version from {time} back into the draft? Your current draft stays in the history.', { time: time(r.updatedAt) }),
    )
  )
    return;
  busy.value = r.id;
  error.value = '';
  try {
    // Unsaved changes are saved first so they are in the history too.
    if (!(await props.beforeRestore())) return;
    const page = await api<AdminPage>(`/admin/pages/${props.pageId}/revisions/${r.id}/restore`, { method: 'POST' });
    emit('restored', page, time(r.updatedAt));
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    busy.value = null;
  }
}

onMounted(refresh);
</script>

<template>
  <div class="fixed inset-0 z-50 flex justify-end bg-slate-900/20" @click.self="emit('close')">
    <aside
      class="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
      role="dialog"
      aria-modal="true"
      :aria-label="$t('Version history')"
    >
      <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 class="text-sm font-black">{{ $t('Version history') }}</h2>
          <p class="text-[11px] text-slate-400">{{ $t('Every publish, and your edits every 10 minutes. The last 50 are kept.') }}</p>
        </div>
        <button type="button" class="btn-icon" :title="$t('Close')" @click="emit('close')"><i class="mdi mdi-close text-lg" /></button>
      </div>
      <p v-if="error" class="mx-5 mt-4 whitespace-pre-line rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{{ error }}</p>
      <div v-if="loading" class="m-5 h-40 animate-pulse rounded-2xl bg-slate-100" />
      <p v-else-if="!revisions.length" class="px-5 py-8 text-center text-sm text-slate-400">{{ $t('No saved versions yet.') }}</p>
      <ol v-else class="flex-1 overflow-y-auto px-3 py-3">
        <li
          v-for="(r, i) in revisions"
          :key="r.id"
          class="group flex items-start gap-3 rounded-2xl px-3 py-3 hover:bg-slate-50"
          data-revision
        >
          <span
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            :class="r.kind === 'publish' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
          >
            <i class="mdi" :class="ICON[r.kind]" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">
              {{ $t(KIND[r.kind]) }}
              <span v-if="i === 0" class="ms-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{{
                $t('latest')
              }}</span>
            </p>
            <p class="text-xs text-slate-500">{{ time(r.updatedAt) }}</p>
            <p class="truncate text-[11px] text-slate-400">
              <span v-if="r.author" dir="ltr">{{ r.author }} · </span>{{ r.titles[locale] }} ·
              {{ $t('{n} blocks', { n: r.blocks[locale] ?? 0 }) }}
            </p>
          </div>
          <button
            v-if="i > 0"
            type="button"
            class="btn-light shrink-0 !px-3 !py-1.5 text-xs opacity-0 transition group-hover:opacity-100 focus:opacity-100"
            :disabled="busy !== null"
            @click="restore(r)"
          >
            {{ busy === r.id ? $t('Restoring…') : $t('Restore') }}
          </button>
        </li>
      </ol>
    </aside>
  </div>
</template>
