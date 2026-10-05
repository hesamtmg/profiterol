<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });

interface RedirectRow {
  id: string;
  from: string;
  to: string;
  status: number;
  hits: number;
  lastHitAt: string | null;
}

const api = useApi();
const rows = ref<RedirectRow[]>([]);
const form = reactive({ from: '', to: '', status: 301 });
const error = ref('');
const busy = ref(false);
const q = ref('');
const shown = computed(() => {
  const words = q.value.trim().toLowerCase();
  return words ? rows.value.filter((r) => r.from.includes(words) || r.to.toLowerCase().includes(words)) : rows.value;
});

async function load() {
  rows.value = await api<RedirectRow[]>('/admin/redirects').catch((err) => ((error.value = apiErrorMessage(err)), []));
}

async function add() {
  busy.value = true;
  error.value = '';
  try {
    rows.value.unshift(await api<RedirectRow>('/admin/redirects', { method: 'POST', body: { ...form } }));
    Object.assign(form, { from: '', to: '', status: 301 });
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    busy.value = false;
  }
}

async function remove(r: RedirectRow) {
  if (!confirm(translate('Remove the redirect from {from}?', { from: r.from }))) return;
  await api(`/admin/redirects/${r.id}`, { method: 'DELETE' });
  rows.value = rows.value.filter((x) => x.id !== r.id);
}

async function setStatus(r: RedirectRow, status: number) {
  Object.assign(r, await api<RedirectRow>(`/admin/redirects/${r.id}`, { method: 'PATCH', body: { status } }));
}

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(adminLocale()) : '—');
onMounted(load);
</script>

<template>
  <div>
    <h1 class="text-3xl font-black">{{ $t('Redirects') }}</h1>
    <p class="mt-1 max-w-3xl text-sm font-light text-slate-500">
      {{ $t('Send visitors (and search engines) from old addresses to new ones, e.g. after moving from another site.') }}
    </p>

    <form class="mt-6 flex flex-wrap items-end gap-3 rounded-[2rem] bg-white p-6 shadow-sm" @submit.prevent="add">
      <div class="min-w-56 flex-1">
        <label class="field-label" for="redirect-from">{{ $t('Old address') }}</label>
        <input id="redirect-from" v-model="form.from" class="input" dir="ltr" placeholder="/page/about-us" required />
      </div>
      <div class="min-w-56 flex-1">
        <label class="field-label" for="redirect-to">{{ $t('New address') }}</label>
        <input id="redirect-to" v-model="form.to" class="input" dir="ltr" placeholder="/fa/about" required />
      </div>
      <div>
        <label class="field-label" for="redirect-status">{{ $t('Kind') }}</label>
        <select id="redirect-status" v-model.number="form.status" class="input">
          <option :value="301">{{ $t('Moved for good (301)') }}</option>
          <option :value="302">{{ $t('For now (302)') }}</option>
        </select>
      </div>
      <button type="submit" class="btn-dark" :disabled="busy"><i class="mdi mdi-plus" /> {{ $t('Add redirect') }}</button>
    </form>
    <p v-if="error" class="mt-4 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>

    <div class="mt-8 overflow-hidden rounded-[2rem] bg-white shadow-sm">
      <div class="border-b border-slate-100 p-4">
        <input v-model="q" type="search" class="input" :placeholder="$t('Search addresses')" :aria-label="$t('Search')" />
      </div>
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th class="px-6 py-3 text-start font-medium">{{ $t('Old address') }}</th>
            <th class="px-3 py-3 text-start font-medium">{{ $t('New address') }}</th>
            <th class="px-3 py-3 text-start font-medium">{{ $t('Kind') }}</th>
            <th class="hidden px-3 py-3 text-start font-medium md:table-cell">{{ $t('Visits') }}</th>
            <th class="px-6 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in shown" :key="r.id" class="border-t border-slate-100" :data-from="r.from">
            <td class="px-6 py-3 text-xs" dir="ltr">{{ r.from }}</td>
            <td class="px-3 py-3 text-xs" dir="ltr">{{ r.to }}</td>
            <td class="px-3 py-3">
              <select
                :value="r.status"
                class="input !w-auto !py-1 text-xs"
                :aria-label="$t('Kind')"
                @change="setStatus(r, Number(($event.target as HTMLSelectElement).value))"
              >
                <option :value="301">301</option>
                <option :value="302">302</option>
              </select>
            </td>
            <td class="hidden px-3 py-3 text-xs text-slate-500 md:table-cell">{{ r.hits }} · {{ date(r.lastHitAt) }}</td>
            <td class="px-6 py-3 text-end">
              <button type="button" class="btn-icon hover:!text-red-600" :title="$t('Delete')" @click="remove(r)">
                <i class="mdi mdi-trash-can-outline" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!shown.length" class="py-10 text-center text-sm text-slate-400">{{ $t('No redirects yet.') }}</p>
    </div>
  </div>
</template>
