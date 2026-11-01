<script setup lang="ts">
/**
 * Admin → Preview sites, for the admins of a site the owner allows it on: previews under this site's own address
 * (components/admin/PreviewSites.vue, mode "site"), within the owner's limits.
 */
import AdminPreviewSites, { type PreviewRow } from '~/components/admin/PreviewSites.vue';

definePageMeta({ layout: 'admin', middleware: 'admin' });

interface Overview {
  max: number;
  maxDays: number;
  live: number;
  base: string;
  graceDays: number;
  previews: PreviewRow[];
}

const api = useApi();
const { isAdmin, user } = useAuth();
const data = ref<Overview | null>(null);
const error = ref('');

async function refresh() {
  try {
    data.value = await api<Overview>('/admin/previews');
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
}

onMounted(async () => {
  if (!isAdmin.value || !user.value?.site?.hostsPreviews) return void (await navigateTo('/admin'));
  await refresh();
});
</script>

<template>
  <div>
    <p v-if="error" class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>
    <div v-if="!data && !error" class="h-40 animate-pulse rounded-[2rem] bg-white" />
    <AdminPreviewSites
      v-if="data"
      mode="site"
      :previews="data.previews"
      :base="data.base"
      :grace-days="data.graceDays"
      :limits="{ max: data.max, maxDays: data.maxDays, live: data.live }"
      @changed="refresh"
    />
  </div>
</template>
