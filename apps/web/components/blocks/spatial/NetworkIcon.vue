<script setup lang="ts">
/** A profile network's icon: from Material Design Icons, or drawn here for the ones it lacks (TikTok, Telegram). */
const props = defineProps<{ network: string }>();

const mdi: Record<string, string> = {
  instagram: 'mdi-instagram',
  linkedin: 'mdi-linkedin',
  youtube: 'mdi-youtube',
  x: 'mdi-alpha-x-box',
  whatsapp: 'mdi-whatsapp',
  email: 'mdi-email-outline',
};
const drawn: Record<string, string> = {
  tiktok:
    'M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  telegram:
    'M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z',
};
const path = computed(() => drawn[props.network]);
</script>

<template>
  <svg v-if="path" viewBox="0 0 24 24" class="inline-block h-[1em] w-[1em] align-[-0.125em]" fill="currentColor" aria-hidden="true">
    <path :d="path" />
  </svg>
  <i v-else-if="mdi[network]" class="mdi leading-none" :class="mdi[network]" aria-hidden="true" />
</template>
