<script setup lang="ts">
/**
 * Admin → Preview sites, the preview maker for a site's admins: previews under this site's own address
 * (components/admin/PreviewSites.vue, mode "site"), within the limits the owner set in Admin → Sites. Until the owner
 * allows it, the page says so and how to get it. The site's details are read again on every visit, so a change by
 * the owner shows without signing in again.
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
const { isAdmin, isOwner, user, fetchMe } = useAuth();
const data = ref<Overview | null>(null);
const error = ref('');
const loading = ref(true);
const allowed = computed(() => !!user.value?.site?.hostsPreviews);
const steps = [
  {
    icon: 'mdi-eye-plus-outline',
    title: 'Make a preview',
    text: 'Pick a design and a name; it is ready at your address, under /preview/, with its pages published.',
  },
  {
    icon: 'mdi-account-key-outline',
    title: 'Send its admin panel',
    text: 'Give your customer (or anyone) an admin account on that preview, so they can change everything.',
  },
  {
    icon: 'mdi-check-decagram-outline',
    title: 'They buy it',
    text: 'Send us their domain and the preview becomes their real site, with everything they made.',
  },
];

async function refresh() {
  try {
    data.value = await api<Overview>('/admin/previews');
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
}

onMounted(async () => {
  await fetchMe();
  if (!isAdmin.value || user.value?.site?.preview) return void (await navigateTo('/admin'));
  if (allowed.value) await refresh();
  loading.value = false;
});
</script>

<template>
  <div>
    <p v-if="error" class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>
    <div v-if="loading" class="h-40 animate-pulse rounded-[2rem] bg-white" />

    <AdminPreviewSites
      v-else-if="allowed && data"
      mode="site"
      :previews="data.previews"
      :base="data.base"
      :grace-days="data.graceDays"
      :limits="{ max: data.max, maxDays: data.maxDays, live: data.live }"
      @changed="refresh"
    />

    <!-- Not allowed on this site (yet). -->
    <div v-else-if="!allowed" data-testid="previews-off">
      <h1 class="text-3xl font-black">{{ $t('Preview sites') }}</h1>
      <p class="mt-1 max-w-2xl text-sm font-light text-slate-500">
        {{
          $t(
            'A ready site to show someone before they buy: they get its admin, can change everything, and it goes offline when its days are up.',
          )
        }}
      </p>
      <div class="mt-8 grid gap-4 md:grid-cols-3">
        <div v-for="(step, i) in steps" :key="i" class="rounded-[2rem] bg-white p-6 shadow-sm">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg"><i class="mdi" :class="step.icon" /></span>
          <p class="mt-4 font-black">{{ $t(step.title) }}</p>
          <p class="mt-1 text-sm text-slate-500">{{ $t(step.text) }}</p>
        </div>
      </div>
      <div class="mt-6 rounded-[2rem] bg-amber-50 p-6 text-sm text-amber-900 ring-1 ring-amber-200">
        <p class="font-semibold"><i class="mdi mdi-lock-outline" /> {{ $t('Preview sites are not turned on for this site yet.') }}</p>
        <p v-if="isOwner" class="mt-1">
          {{ $t('Turn them on in Sites: open this site’s settings and tick “Let this site’s admins make preview sites”.') }}
          <NuxtLink to="/admin/sites" class="font-semibold underline">{{ $t('Open Sites') }}</NuxtLink>
        </p>
        <p v-else class="mt-1">{{ $t('Ask whoever runs your website platform to turn them on for your site.') }}</p>
      </div>
    </div>
  </div>
</template>
