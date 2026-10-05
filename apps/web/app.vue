<script setup lang="ts">
// Without JavaScript, entrance animations (plugins/animate.ts) never play, so show their blocks as they are.
useHead({
  noscript: [{ innerHTML: '<style>.anim{opacity:1!important;transform:none!important;filter:none!important;clip-path:none!important}</style>' }],
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
