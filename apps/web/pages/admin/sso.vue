<script setup lang="ts">
/**
 * Where "Open admin" in Admin → Sites lands: spends the one-time link (in the address's #fragment, so it never
 * reaches server logs) for a session on this site, then opens the admin.
 */
definePageMeta({ layout: false });

const api = useApi();
const { fetchMe } = useAuth();
const { t } = useAdminI18n();
const error = ref('');

onMounted(async () => {
  const ticket = new URLSearchParams(window.location.hash.slice(1)).get('ticket') ?? '';
  history.replaceState(null, '', '/admin/sso');
  try {
    if (!ticket) throw new Error(t('This link has expired. Open the site again from Admin → Sites.'));
    await api('/auth/sso', { method: 'POST', body: { ticket } });
    await fetchMe();
    await navigateTo('/admin', { replace: true });
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
});
useHead({ title: () => t('Signing in…') });
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-800">
    <div class="w-full max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-sm">
      <template v-if="!error">
        <i class="mdi mdi-loading mdi-spin text-3xl text-[#00a998]" />
        <p class="mt-3 text-sm">{{ $t('Signing in…') }}</p>
      </template>
      <template v-else>
        <p class="text-sm text-red-600">{{ error }}</p>
        <NuxtLink to="/admin/login" class="btn-dark mt-6 inline-flex">{{ $t('Sign in') }}</NuxtLink>
      </template>
    </div>
  </div>
</template>
