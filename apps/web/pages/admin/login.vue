<script setup lang="ts">
import AdminLangSwitch from '~/components/admin/AdminLangSwitch.vue';
definePageMeta({ layout: false });

const { login } = useAuth();
const route = useRoute();
const email = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);
/** "Forgot password?" mode: emails a link when the server can send email, otherwise explains whom to ask. */
const forgot = ref(false);
const forgotSent = ref(false);
const canEmail = ref<boolean | null>(null);
const api = useApi();

async function openForgot() {
  forgot.value = true;
  error.value = '';
  if (canEmail.value === null)
    canEmail.value = (await api<{ available: boolean }>('/auth/forgot').catch(() => ({ available: false }))).available;
}

async function sendForgot() {
  busy.value = true;
  error.value = '';
  try {
    await api('/auth/forgot', { method: 'POST', body: { email: email.value } });
    forgotSent.value = true;
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    busy.value = false;
  }
}

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
    <form class="w-full max-w-sm rounded-[2.5rem] bg-white p-10 shadow-2xl" @submit.prevent="forgot ? sendForgot() : submit()">
      <div class="mb-6 flex justify-end"><AdminLangSwitch /></div>
      <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00a998] text-xl font-black text-white">{{ $t('P') }}</div>
      <template v-if="forgot">
        <h1 class="mt-6 text-2xl font-black">{{ $t('Forgot your password?') }}</h1>
        <p v-if="canEmail === false" class="mt-3 text-sm text-slate-600">
          {{ $t('Ask an admin of this site for a new password link (Users → Password link).') }}
        </p>
        <p v-else-if="forgotSent" class="mt-3 text-sm text-slate-600" role="status">
          {{ $t('If that email has an account, a link to choose a new password is on its way. It works for 2 hours.') }}
        </p>
        <template v-else-if="canEmail">
          <p class="mt-1 text-sm font-light text-slate-500">{{ $t('We will email you a link to choose a new one.') }}</p>
          <label class="mt-8 block text-xs font-medium text-slate-500" for="forgot-email">{{ $t('Email') }}</label>
          <input id="forgot-email" v-model="email" type="email" required autocomplete="username" class="input mt-1" dir="ltr" />
          <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
          <button
            type="submit"
            :disabled="busy"
            class="mt-6 w-full rounded-full bg-slate-900 py-3 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {{ $t('Send the link') }}
          </button>
        </template>
        <button type="button" class="mt-6 text-sm text-slate-500 hover:text-slate-900" @click="((forgot = false), (forgotSent = false))">
          <i class="mdi mdi-arrow-left rtl:rotate-180" /> {{ $t('Back to log in') }}
        </button>
      </template>
      <template v-else>
        <h1 class="mt-6 text-2xl font-black">{{ $t('Welcome back') }}</h1>
        <p class="mt-1 text-sm font-light text-slate-500">{{ $t('Log in to edit your site.') }}</p>

        <label class="mt-8 block text-xs font-medium text-slate-500" for="login-email">{{ $t('Email') }}</label>
        <input id="login-email" v-model="email" type="email" required autocomplete="username" class="input mt-1" dir="ltr" />
        <div class="mt-4 flex items-baseline justify-between">
          <label class="block text-xs font-medium text-slate-500" for="login-password">{{ $t('Password') }}</label>
          <button type="button" class="text-xs text-slate-400 hover:text-slate-900" @click="openForgot">
            {{ $t('Forgot password?') }}
          </button>
        </div>
        <input
          id="login-password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="input mt-1"
          dir="ltr"
        />

        <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
        <button
          type="submit"
          :disabled="busy"
          class="mt-6 w-full rounded-full bg-slate-900 py-3 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {{ busy ? $t('Logging in…') : $t('Log in') }}
        </button>
      </template>
    </form>
  </div>
</template>
