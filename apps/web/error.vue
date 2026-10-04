<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();
const notFound = computed(() => props.error.statusCode === 404);
</script>

<template>
  <div class="site @container flex min-h-screen items-center justify-center p-6">
    <div class="panel max-w-lg p-12 text-center">
      <p class="text-7xl font-black text-primary">{{ error.statusCode }}</p>
      <h1 class="mt-4 text-2xl font-black">{{ notFound ? 'Page not found' : 'Something went wrong' }}</h1>
      <p class="mt-2 font-extralight text-muted" lang="fa" dir="rtl">
        {{ notFound ? 'صفحه پیدا نشد' : 'خطایی رخ داد' }}
      </p>
      <button type="button" class="btn-pill mt-8 bg-primary text-white" @click="clearError({ redirect: '/' })">
        Home · خانه
      </button>
    </div>
  </div>
</template>
