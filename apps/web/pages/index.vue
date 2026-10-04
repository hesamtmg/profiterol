<script setup lang="ts">
import { defaultLocale, locales } from '@profiterol/blocks';

// Send visitors to their preferred language when we support it, otherwise the default.
const header = useRequestHeaders(['accept-language'])['accept-language'] ?? '';
const preferred = header
  .split(',')
  .map((part) => part.split(';')[0].trim().slice(0, 2).toLowerCase())
  .find((code) => locales.some((l) => l.code === code));

await navigateTo(`/${preferred ?? defaultLocale}`, { redirectCode: 302 });
</script>

<template>
  <div />
</template>
