<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });

interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  active: boolean;
  locked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const api = useApi();
const { user: me } = useAuth();
const users = ref<AdminUserRow[]>([]);
const loading = ref(true);
const error = ref('');
const busy = ref(false);
const showInvite = ref(false);
const invite = reactive({ email: '', name: '', role: 'editor' as 'admin' | 'editor' });
/** The last link made (invitation or password reset), shown so it can be passed on by hand. */
const shared = ref<{ email: string; link: string; emailed: boolean; kind: 'invite' | 'reset' } | null>(null);
const copied = ref(false);

async function refresh() {
  loading.value = true;
  try {
    users.value = await api<AdminUserRow[]>('/admin/users');
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function run(fn: () => Promise<void>) {
  busy.value = true;
  error.value = '';
  try {
    await fn();
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    busy.value = false;
  }
}

const sendInvite = () =>
  run(async () => {
    const res = await api<{ user: AdminUserRow; link: string; emailed: boolean }>('/admin/users', { method: 'POST', body: { ...invite } });
    users.value.push(res.user);
    shared.value = { email: res.user.email, link: res.link, emailed: res.emailed, kind: 'invite' };
    Object.assign(invite, { email: '', name: '', role: 'editor' });
    showInvite.value = false;
  });

const update = (u: AdminUserRow, changes: Partial<Pick<AdminUserRow, 'role' | 'active' | 'name'>>) =>
  run(async () => {
    Object.assign(u, await api<AdminUserRow>(`/admin/users/${u.id}`, { method: 'PATCH', body: changes }));
  }).finally(() => (error.value ? refresh() : undefined));

const resetLink = (u: AdminUserRow) =>
  run(async () => {
    const res = await api<{ link: string }>(`/admin/users/${u.id}/reset-link`, { method: 'POST' });
    shared.value = { email: u.email, link: res.link, emailed: false, kind: 'reset' };
  });

async function copy() {
  if (!shared.value) return;
  await navigator.clipboard.writeText(shared.value.link).catch(() => undefined);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
}

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(adminLocale()) : translate('Never'));

onMounted(refresh);
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black">{{ $t('Users') }}</h1>
        <p class="mt-1 text-sm font-light text-slate-500">
          {{ $t('Admins can change everything, including settings and users. Editors can edit pages, collections, media and the inbox.') }}
        </p>
      </div>
      <button type="button" class="btn-dark" @click="showInvite = !showInvite"><i class="mdi mdi-account-plus-outline" /> {{ $t('Invite someone') }}</button>
    </div>

    <form v-if="showInvite" class="mt-6 rounded-[2rem] bg-white p-7 shadow-sm" @submit.prevent="sendInvite">
      <h2 class="font-black">{{ $t('Invite someone') }}</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label class="field-label" for="inv-email">{{ $t('Email') }}</label>
          <input id="inv-email" v-model="invite.email" type="email" class="input" dir="ltr" required />
        </div>
        <div>
          <label class="field-label" for="inv-name">{{ $t('Name') }}</label>
          <input id="inv-name" v-model="invite.name" class="input" />
        </div>
        <div>
          <label class="field-label" for="inv-role">{{ $t('Role') }}</label>
          <select id="inv-role" v-model="invite.role" class="input">
            <option value="editor">{{ $t('Editor') }}</option>
            <option value="admin">{{ $t('Admin') }}</option>
          </select>
        </div>
      </div>
      <div class="mt-6 flex gap-2">
        <button type="submit" class="btn-dark" :disabled="busy">{{ $t('Create account') }}</button>
        <button type="button" class="btn-light" @click="showInvite = false">{{ $t('Cancel') }}</button>
      </div>
    </form>

    <div v-if="shared" class="mt-6 rounded-[2rem] bg-emerald-50 p-6 text-sm text-emerald-900 ring-1 ring-emerald-200" role="status">
      <p class="font-semibold">
        {{ shared.kind === 'invite' ? $t('Account created for {email}.', { email: shared.email }) : $t('New password link for {email}.', { email: shared.email }) }}
        <template v-if="shared.emailed">{{ $t('We emailed them this link.') }}</template>
        <template v-else>{{ $t('Send them this link; it works once.') }}</template>
      </p>
      <div class="mt-3 flex gap-2">
        <input :value="shared.link" readonly class="input min-w-0 flex-1 text-xs" dir="ltr" aria-label="Link" @focus="($event.target as HTMLInputElement).select()" />
        <button type="button" class="btn-light shrink-0" @click="copy"><i class="mdi" :class="copied ? 'mdi-check' : 'mdi-content-copy'" /> {{ $t(copied ? 'Copied' : 'Copy') }}</button>
        <button type="button" class="btn-light shrink-0 !px-3" :title="$t('Close')" @click="shared = null"><i class="mdi mdi-close" /></button>
      </div>
    </div>

    <p v-if="error" class="mt-6 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>

    <div class="mt-8 overflow-hidden rounded-[2rem] bg-white shadow-sm">
      <div v-if="loading" class="h-40 animate-pulse" />
      <table v-else class="w-full text-sm">
        <thead class="bg-slate-50 text-start text-xs text-slate-500">
          <tr>
            <th class="px-6 py-3 text-start font-medium">{{ $t('Name') }}</th>
            <th class="px-3 py-3 text-start font-medium">{{ $t('Role') }}</th>
            <th class="hidden px-3 py-3 text-start font-medium md:table-cell">{{ $t('Last login') }}</th>
            <th class="px-3 py-3 text-start font-medium">{{ $t('Status') }}</th>
            <th class="px-6 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="border-t border-slate-100" :class="{ 'opacity-50': !u.active }" :data-email="u.email">
            <td class="px-6 py-4">
              <p class="font-semibold">{{ u.name || '—' }} <span v-if="u.id === me?.id" class="text-xs font-normal text-slate-400">({{ $t('you') }})</span></p>
              <p class="text-xs text-slate-500" dir="ltr">{{ u.email }}</p>
            </td>
            <td class="px-3 py-4">
              <select
                :value="u.role"
                class="input !w-auto !py-1.5 text-xs"
                :disabled="busy || u.id === me?.id"
                :aria-label="$t('Role')"
                @change="update(u, { role: ($event.target as HTMLSelectElement).value as 'admin' | 'editor' })"
              >
                <option value="editor">{{ $t('Editor') }}</option>
                <option value="admin">{{ $t('Admin') }}</option>
              </select>
            </td>
            <td class="hidden px-3 py-4 text-xs text-slate-500 md:table-cell">{{ date(u.lastLoginAt) }}</td>
            <td class="px-3 py-4 text-xs">
              <span v-if="!u.active" class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{{ $t('Deactivated') }}</span>
              <span v-else-if="u.locked" class="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800" :title="$t('Too many wrong passwords. Unlocks by itself after 15 minutes, or when reactivated.')">{{ $t('Locked') }}</span>
              <span v-else-if="!u.lastLoginAt" class="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">{{ $t('Invited') }}</span>
              <span v-else class="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">{{ $t('Active') }}</span>
            </td>
            <td class="px-6 py-4 text-end">
              <div v-if="u.id !== me?.id" class="flex justify-end gap-1">
                <button type="button" class="btn-light !px-3 !py-1.5 text-xs" :disabled="busy || !u.active" :title="$t('Make a new password link')" @click="resetLink(u)">
                  <i class="mdi mdi-key-outline" /><span class="hidden lg:inline"> {{ $t('Password link') }}</span>
                </button>
                <button v-if="u.active" type="button" class="btn-light !px-3 !py-1.5 text-xs" :disabled="busy" @click="update(u, { active: false })">
                  {{ $t('Deactivate') }}
                </button>
                <button v-else type="button" class="btn-light !px-3 !py-1.5 text-xs" :disabled="busy" @click="update(u, { active: true })">
                  {{ $t('Reactivate') }}
                </button>
              </div>
              <NuxtLink v-else to="/admin/account" class="text-xs text-[#00a998] hover:underline">{{ $t('Change your password') }}</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
