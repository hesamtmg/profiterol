<script setup lang="ts">
import { locales, siteDefaultLocale } from '@profiterol/blocks';

// The site's language when its admin chose one (Admin → Settings); otherwise the visitor's preferred language
// when we support it, else the default.
const { data: settings } = await useSiteSettings();
const header = useRequestHeaders(['accept-language'])['accept-language'] ?? '';
const preferred = header
  .split(',')
  .map((part) => part.split(';')[0].trim().slice(0, 2).toLowerCase())
  .find((code) => locales.some((l) => l.code === code));
const chosen = settings.value?.defaultLocale;

await navigateTo(`/${chosen ? siteDefaultLocale(chosen) : (preferred ?? siteDefaultLocale())}`, { redirectCode: 302 });
</script>

<template>
  <div />
</template>
