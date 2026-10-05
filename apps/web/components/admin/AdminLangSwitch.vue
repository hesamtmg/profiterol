<script setup lang="ts">
/** English / فارسی switch for the admin interface (not the site's content languages). */
const { lang, setLang } = useAdminI18n();
</script>

<template>
  <div class="inline-flex rounded-full bg-slate-100 p-0.5 text-xs" role="radiogroup" aria-label="Admin language / زبان مدیریت">
    <button
      v-for="l in ([{ code: 'en', label: 'English' }, { code: 'fa', label: 'فارسی' }] as const)"
      :key="l.code"
      type="button"
      role="radio"
      :aria-checked="lang === l.code"
      class="rounded-full px-3 py-1 transition"
      :class="lang === l.code ? 'bg-white font-semibold shadow-sm' : 'text-slate-500 hover:text-slate-800'"
      :lang="l.code"
      @click="setLang(l.code)"
    >
      {{ l.label }}
    </button>
  </div>
</template>
