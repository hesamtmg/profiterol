<script setup lang="ts">
import type { HeaderNav } from './nav';

/** The site's logo, or its name as text when it has none (or beside it, with `withName`). */
defineProps<{ nav: HeaderNav; withName?: boolean; textClass?: string; imageClass?: string }>();
</script>

<template>
  <a :href="`/${nav.locale}`" class="flex shrink-0 items-center gap-3">
    <img
      v-if="nav.logo"
      :src="nav.logo"
      :alt="nav.siteName"
      class="w-auto"
      :class="imageClass ?? 'h-9'"
      :style="nav.light ? 'filter: brightness(0) invert(1)' : ''"
    />
    <span v-if="!nav.logo || withName" :class="textClass ?? 'text-lg font-black tracking-tight'">{{ nav.siteName }}</span>
  </a>
</template>
