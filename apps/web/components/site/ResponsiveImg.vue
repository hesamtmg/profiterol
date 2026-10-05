<script setup lang="ts">
/**
 * A photo with an optional separate version for phones. Container queries (not media queries) pick
 * the version, so the editor's phone preview shows the phone photo.
 */
defineProps<{ src: string; mobile?: string; alt?: string; imgClass?: string; eager?: boolean }>();
</script>

<template>
  <template v-if="mobile && src">
    <img :src="src" :alt="alt ?? ''" :class="imgClass" class="hidden @3xl:block" :loading="eager ? 'eager' : 'lazy'" />
    <img :src="mobile" :alt="alt ?? ''" :class="imgClass" class="@3xl:hidden" :loading="eager ? 'eager' : 'lazy'" />
  </template>
  <img v-else-if="src || mobile" :src="src || mobile" :alt="alt ?? ''" :class="imgClass" :loading="eager ? 'eager' : 'lazy'" />
</template>
