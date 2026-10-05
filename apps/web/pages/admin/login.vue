<script setup lang="ts">
import AdminLangSwitch from '~/components/admin/AdminLangSwitch.vue';
definePageMeta({ layout: false });

const { login } = useAuth();
const route = useRoute();
const email = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  busy.value = true;
  error.value = '';
  try {
    await login(email.value, password.value);
    const next = String(route.query.next ?? '');
    await navigateTo(next.startsWith('/admin') ? next : '/admin');
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    busy.value = false;
  }
}

const { lang, dir, t } = useAdminI18n();
useHead(() => ({ title: t('Log in · Profiterol'), htmlAttrs: { lang: lang.value, dir: dir.value } }));
</script>

<template>
  <div class="admin-ui flex min-h-screen items-center justify-center bg-[#00a998] p-4">
    <form class="w-full max-w-sm rounded-[2.5rem] bg-white p-10 shadow-2xl" @submit.prevent="submit">
      <div class="mb-6 flex justify-end"><AdminLangSwitch /></div>
      <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00a998] text-xl font-black text-white">{{ $t('P') }}</div>
      <h1 class="mt-6 text-2xl font-black">{{ $t('Welcome back') }}</h1>
      <p class="mt-1 text-sm font-light text-slate-500">{{ $t('Log in to edit your site.') }}</p>

      <label class="mt-8 block text-xs font-medium text-slate-500">{{ $t('Email') }}</label>
      <input v-model="email" type="email" required autocomplete="username" class="input mt-1" />
      <label class="mt-4 block text-xs font-medium text-slate-500">{{ $t('Password') }}</label>
      <input v-model="password" type="password" required autocomplete="current-password" class="input mt-1" />

      <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
      <button type="submit" :disabled="busy" class="mt-6 w-full rounded-full bg-slate-900 py-3 text-sm font-medium text-white hover:bg-black disabled:opacity-50">
        {{ busy ? $t('Logging in…') : $t('Log in') }}
      </button>
    </form>
  </div>
</template>
