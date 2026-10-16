<script setup lang="ts">
/** The "menu." pill with two uneven lines, as on awakeagency.dev. `light`: over a photo or a colored panel. */
defineProps<{ locale: string; light?: boolean; dark?: boolean }>();
</script>

<template>
  <button
    type="button"
    class="group flex items-center gap-3 rounded-full px-6 py-2.5 text-lg leading-none shadow-sm transition hover:scale-105"
    :class="dark ? 'bg-dark text-white' : light ? 'bg-white text-primary' : 'bg-primary text-white'"
    aria-haspopup="dialog"
  >
    {{ locale === 'fa' ? 'منو.' : 'menu.' }}
    <span class="flex w-5 flex-col items-end gap-[5px]" aria-hidden="true">
      <span class="h-[2px] w-full rounded bg-current transition-all duration-300 group-hover:w-3" />
      <span class="h-[2px] w-3 rounded bg-current transition-all duration-300 group-hover:w-full" />
    </span>
  </button>
</template>
