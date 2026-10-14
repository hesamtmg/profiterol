<script setup lang="ts">
import { isLocale, LOCALE_COOKIE, locales, siteDefaultLocale } from '@profiterol/blocks';

// Where the root address sends a visitor:
// 1. the language they picked on this site before (the header's language links remember it);
// 2. on a first visit, the site's language when its admin chose one (Admin → Settings);
// 3. otherwise their browser's language when the site has it, else the default.
const { data: settings } = await useSiteSettings();
const remembered = useCookie(LOCALE_COOKIE).value;
const header = useRequestHeaders(['accept-language'])['accept-language'] ?? '';
const preferred = header
  .split(',')
  .map((part) => part.split(';')[0].trim().slice(0, 2).toLowerCase())
  .find((code) => locales.some((l) => l.code === code));
const chosen = settings.value?.defaultLocale;
const target = remembered && isLocale(remembered) ? remembered : chosen ? siteDefaultLocale(chosen) : (preferred ?? siteDefaultLocale());

await navigateTo(`/${target}`, { redirectCode: 302 });
</script>

<template>
  <div />
</template>
