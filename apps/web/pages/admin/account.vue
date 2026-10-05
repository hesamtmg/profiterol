<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });

const api = useApi();
const { user, login } = useAuth();
const form = reactive({ current: '', password: '', repeat: '' });
const error = ref('');
const done = ref(false);
const busy = ref(false);

async function save() {
  error.value = '';
  done.value = false;
  if (form.password !== form.repeat) {
    error.value = translate('The two new passwords are not the same');
    return;
  }
  busy.value = true;
  try {
    await api('/auth/password', { method: 'POST', body: { current: form.current, password: form.password } });
    // A new password ends every session, this one included, so sign in again with it.
    await login(user.value!.email, form.password);
    Object.assign(form, { current: '', password: '', repeat: '' });
    done.value = true;
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="max-w-xl">
    <h1 class="text-3xl font-black">{{ $t('Your account') }}</h1>
    <p class="mt-1 text-sm font-light text-slate-500" dir="ltr">{{ user?.email }}</p>

    <form class="mt-8 rounded-[2rem] bg-white p-7 shadow-sm" @submit.prevent="save">
      <h2 class="font-black">{{ $t('Change your password') }}</h2>
      <p class="mt-1 text-xs text-slate-500">{{ $t('You will stay signed in here; other devices will be signed out.') }}</p>
      <label class="field-label mt-5" for="pw-current">{{ $t('Current password') }}</label>
      <input id="pw-current" v-model="form.current" type="password" class="input" autocomplete="current-password" required />
      <label class="field-label mt-4" for="pw-new">{{ $t('New password') }}</label>
      <input id="pw-new" v-model="form.password" type="password" class="input" autocomplete="new-password" minlength="8" required />
      <p class="mt-1 text-[11px] text-slate-400">{{ $t('At least 8 characters.') }}</p>
      <label class="field-label mt-4" for="pw-repeat">{{ $t('New password again') }}</label>
      <input id="pw-repeat" v-model="form.repeat" type="password" class="input" autocomplete="new-password" required />
      <p v-if="error" class="mt-4 whitespace-pre-line rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
      <p v-if="done" class="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{{ $t('Password changed.') }}</p>
      <button type="submit" class="btn-dark mt-6" :disabled="busy">{{ $t('Change password') }}</button>
    </form>
  </div>
</template>
