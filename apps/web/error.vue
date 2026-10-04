<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();
const code = computed(() => props.error.statusCode);

const text = computed(() => {
  if (code.value === 404) return { en: 'Page not found', fa: 'صفحه پیدا نشد' };
  if (code.value === 503) return { en: 'Back in a moment. This page reloads by itself.', fa: 'چند لحظه دیگر برمی‌گردیم. صفحه خودکار دوباره بارگذاری می‌شود.' };
  return { en: 'Something went wrong', fa: 'خطایی رخ داد' };
});

// While the site restarts (e.g. during an update), try again shortly.
onMounted(() => {
  if (code.value === 503) setTimeout(() => location.reload(), 8000);
});
</script>

<template>
  <div class="site @container flex min-h-screen items-center justify-center p-6">
    <div class="panel max-w-lg p-12 text-center">
      <p class="text-7xl font-black text-primary">{{ code }}</p>
      <h1 class="mt-4 text-2xl font-black">{{ text.en }}</h1>
      <p class="mt-2 font-extralight text-muted" lang="fa" dir="rtl">{{ text.fa }}</p>
      <button type="button" class="btn-pill mt-8 bg-primary text-white" @click="clearError({ redirect: '/' })">
        Home · خانه
      </button>
    </div>
  </div>
</template>
