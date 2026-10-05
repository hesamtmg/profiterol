<script setup lang="ts">
/** English / فارسی switch for the admin interface (not the site's content languages). */
const { lang, setLang } = useAdminI18n();
</script>

<template>
  <!-- Short labels and an icon, so it is not mistaken for the content-language tabs in the editors. -->
  <div
    class="inline-flex items-center rounded-full bg-slate-100 p-0.5 text-xs"
    role="radiogroup"
    aria-label="Admin language / زبان مدیریت"
    title="Admin language / زبان مدیریت"
  >
    <i class="mdi mdi-translate px-1.5 text-slate-400" aria-hidden="true" />
    <button
      v-for="l in [
        { code: 'en', label: 'EN', name: 'English' },
        { code: 'fa', label: 'فا', name: 'فارسی' },
      ] as const"
      :key="l.code"
      type="button"
      role="radio"
      :aria-checked="lang === l.code"
      class="rounded-full px-3 py-1 transition"
      :class="lang === l.code ? 'bg-white font-semibold shadow-sm' : 'text-slate-500 hover:text-slate-800'"
      :lang="l.code"
      :aria-label="l.name"
      @click="setLang(l.code)"
    >
      {{ l.label }}
    </button>
  </div>
</template>
