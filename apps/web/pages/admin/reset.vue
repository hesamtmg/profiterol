<script setup lang="ts">
/** Choose a password from an invitation or reset link (/admin/reset?token=…). Works signed out. */
import AdminLangSwitch from '~/components/admin/AdminLangSwitch.vue';
definePageMeta({ layout: false });

const api = useApi();
const route = useRoute();
const token = computed(() => String(route.query.token ?? ''));
const password = ref('');
const repeat = ref('');
const error = ref('');
const busy = ref(false);
const done = ref(false);

async function submit() {
  error.value = '';
  if (password.value !== repeat.value) {
    error.value = translate('The two new passwords are not the same');
    return;
  }
  busy.value = true;
  try {
    await api('/auth/reset', { method: 'POST', body: { token: token.value, password: password.value } });
    done.value = true;
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    busy.value = false;
  }
}

// The secret is in the address; keep it out of the Referer header sent by anything this page loads.
const { lang, dir, t } = useAdminI18n();
useHead(() => ({ title: t('Choose a password'), htmlAttrs: { lang: lang.value, dir: dir.value }, meta: [{ name: 'referrer', content: 'no-referrer' }] }));
</script>

<template>
  <div class="admin-ui flex min-h-screen items-center justify-center bg-[#00a998] p-4">
    <form class="w-full max-w-sm rounded-[2.5rem] bg-white p-10 shadow-2xl" @submit.prevent="submit">
      <div class="mb-6 flex justify-end"><AdminLangSwitch /></div>
      <h1 class="text-2xl font-black">{{ $t('Choose a password') }}</h1>
      <template v-if="done">
        <p class="mt-3 text-sm text-slate-600" role="status">{{ $t('Your password is set. You can log in with it now.') }}</p>
        <NuxtLink to="/admin/login" class="mt-6 block w-full rounded-full bg-slate-900 py-3 text-center text-sm font-medium text-white hover:bg-black">{{ $t('Log in') }}</NuxtLink>
      </template>
      <template v-else-if="!token">
        <p class="mt-3 text-sm text-slate-600">{{ $t('This link is incomplete. Open the link from your email again, or ask an admin for a new one.') }}</p>
      </template>
      <template v-else>
        <p class="mt-1 text-sm font-light text-slate-500">{{ $t('At least 8 characters.') }}</p>
        <label class="mt-8 block text-xs font-medium text-slate-500" for="pw">{{ $t('New password') }}</label>
        <input id="pw" v-model="password" type="password" required minlength="8" autocomplete="new-password" class="input mt-1" />
        <label class="mt-4 block text-xs font-medium text-slate-500" for="pw2">{{ $t('New password again') }}</label>
        <input id="pw2" v-model="repeat" type="password" required autocomplete="new-password" class="input mt-1" />
        <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
        <button type="submit" :disabled="busy" class="mt-6 w-full rounded-full bg-slate-900 py-3 text-sm font-medium text-white hover:bg-black disabled:opacity-50">
          {{ $t('Save password') }}
        </button>
      </template>
    </form>
  </div>
</template>
