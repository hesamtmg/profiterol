<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });

interface Submission {
  id: string;
  pageId: string | null;
  pageTitle: string;
  formTitle: string;
  locale: string;
  data: { label: string; value: string }[];
  read: boolean;
  createdAt: string;
}

const api = useApi();
const unread = useState<number>('inbox-unread', () => 0);
const items = ref<Submission[]>([]);
const loading = ref(true);
const filter = ref<'all' | 'unread'>('all');
const selectedId = ref<string | null>(null);
const error = ref('');

const visible = computed(() => items.value.filter((s) => filter.value === 'all' || !s.read));
const selected = computed(() => items.value.find((s) => s.id === selectedId.value) ?? null);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const replyTo = computed(() => selected.value?.data.find((d) => EMAIL.test(d.value))?.value);

function preview(s: Submission) {
  return s.data.find((d) => d.value)?.value ?? '';
}

function when(date: string) {
  return new Date(date).toLocaleString(adminLocale(), { dateStyle: 'medium', timeStyle: 'short' });
}

async function load() {
  loading.value = true;
  try {
    items.value = await api<Submission[]>('/admin/submissions');
    unread.value = items.value.filter((s) => !s.read).length;
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function setRead(s: Submission, read: boolean) {
  if (s.read === read) return;
  s.read = read;
  unread.value += read ? -1 : 1;
  await api(`/admin/submissions/${s.id}`, { method: 'PATCH', body: { read } });
}

async function open(s: Submission) {
  selectedId.value = s.id;
  await setRead(s, true);
}

async function remove(s: Submission) {
  if (!confirm(translate('Delete this message? This cannot be undone.'))) return;
  await api(`/admin/submissions/${s.id}`, { method: 'DELETE' });
  if (!s.read) unread.value--;
  items.value = items.value.filter((x) => x.id !== s.id);
  selectedId.value = null;
}

/** Downloads every message as a CSV file that Excel opens with Persian text intact. */
function exportCsv() {
  const labels = [...new Set(items.value.flatMap((s) => s.data.map((d) => d.label)))];
  const cell = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Date', 'Page', 'Form', 'Language', ...labels].map(cell).join(','),
    ...items.value.map((s) =>
      [when(s.createdAt), s.pageTitle, s.formTitle, s.locale, ...labels.map((l) => s.data.find((d) => d.label === l)?.value ?? '')]
        .map(cell)
        .join(','),
    ),
  ];
  const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `messages-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black">{{ $t('Inbox') }}</h1>
        <p class="mt-1 text-sm font-light text-slate-500">
          {{ $t('Messages sent through contact forms. To also get them by email, set an address in Site settings.') }}
        </p>
      </div>
      <div class="flex gap-2">
        <div class="flex rounded-full bg-white p-1 text-xs shadow-sm">
          <button
            v-for="f in ['all', 'unread'] as const"
            :key="f"
            type="button"
            class="rounded-full px-3 py-1.5 capitalize transition"
            :class="filter === f ? 'bg-slate-900 text-white' : 'text-slate-500'"
            @click="filter = f"
          >
            {{ f === 'unread' ? $t('Unread ({n})', { n: unread }) : $t('All') }}
          </button>
        </div>
        <button type="button" class="btn-light" :disabled="!items.length" @click="exportCsv">
          <i class="mdi mdi-download" /> {{ $t('Export CSV') }}
        </button>
      </div>
    </div>

    <p v-if="error" class="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>

    <div class="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
      <div class="space-y-2">
        <div v-if="loading" class="h-24 animate-pulse rounded-[1.5rem] bg-white" />
        <button
          v-for="s in visible"
          :key="s.id"
          type="button"
          class="flex w-full items-start gap-3 rounded-[1.5rem] bg-white p-4 text-start shadow-sm ring-1 transition hover:shadow-md"
          :class="selectedId === s.id ? 'ring-2 ring-slate-900' : 'ring-slate-200/60'"
          @click="open(s)"
        >
          <span
            class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
            :class="s.read ? 'bg-transparent' : 'bg-[#00a998]'"
            :title="s.read ? '' : 'Unread'"
          />
          <span class="min-w-0 flex-1">
            <span class="flex items-center justify-between gap-2">
              <span class="truncate text-sm" :class="s.read ? 'font-medium' : 'font-black'" :dir="s.locale === 'fa' ? 'rtl' : 'ltr'">{{
                preview(s)
              }}</span>
              <span class="shrink-0 text-[11px] text-slate-400">{{ new Date(s.createdAt).toLocaleDateString(adminLocale()) }}</span>
            </span>
            <span class="mt-0.5 block truncate text-xs text-slate-500"
              >{{ s.formTitle }} · {{ s.pageTitle }} · {{ s.locale.toUpperCase() }}</span
            >
          </span>
        </button>
        <p v-if="!loading && !visible.length" class="py-16 text-center text-sm text-slate-400">
          {{ filter === 'unread' ? $t('No unread messages.') : $t('No messages yet.') }}
        </p>
      </div>

      <section v-if="selected" class="h-fit rounded-[2rem] bg-white p-7 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-xl font-black" :dir="selected.locale === 'fa' ? 'rtl' : 'ltr'">
              {{ selected.formTitle || $t('Contact form') }}
            </h2>
            <p class="text-xs text-slate-400">
              {{ when(selected.createdAt) }} · from the {{ selected.locale.toUpperCase() }} page “{{ selected.pageTitle }}”
            </p>
          </div>
          <div class="flex gap-2">
            <a v-if="replyTo" :href="`mailto:${replyTo}`" class="btn-dark"><i class="mdi mdi-reply" /> {{ $t('Reply') }}</a>
            <button type="button" class="btn-light" @click="setRead(selected, false)">
              <i class="mdi mdi-email-mark-as-unread" /> {{ $t('Mark unread') }}
            </button>
            <button type="button" class="btn-icon hover:!text-red-600" :title="$t('Delete')" @click="remove(selected)">
              <i class="mdi mdi-trash-can-outline text-lg" />
            </button>
          </div>
        </div>
        <dl class="mt-6 space-y-4" :dir="selected.locale === 'fa' ? 'rtl' : 'ltr'">
          <div v-for="(d, i) in selected.data" :key="i" class="rounded-2xl bg-slate-50 p-4">
            <dt class="text-xs font-medium text-slate-500">{{ d.label }}</dt>
            <dd class="mt-1 whitespace-pre-line break-words text-sm">{{ d.value || '—' }}</dd>
          </div>
        </dl>
      </section>
      <div
        v-else-if="visible.length"
        class="hidden items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 text-sm text-slate-400 lg:flex"
      >
        {{ $t('Select a message to read it.') }}
      </div>
    </div>
  </div>
</template>
