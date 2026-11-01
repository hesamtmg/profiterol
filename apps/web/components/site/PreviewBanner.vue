<script setup lang="ts">
/**
 * The strip across the top of a preview site: says it is a preview and how long it has left, with a link to the
 * people who made it. On the public pages in the site's language; in the admin in the admin's.
 */
const props = defineProps<{ preview: PreviewInfo; locale?: string; admin?: boolean }>();

const days = computed(() => previewDaysLeft(props.preview));
const adminLang = props.admin ? useAdminI18n().lang : null;
const fa = computed(() => (adminLang ? adminLang.value : props.locale) === 'fa');

const text = computed(() => {
  if (props.preview.expired) return fa.value ? 'این پیش‌نمایش به پایان رسیده است.' : 'This preview has ended.';
  const left = fa.value
    ? days.value > 1
      ? `${days.value.toLocaleString('fa-IR')} روز مانده`
      : 'امروز آخرین روز است'
    : days.value > 1
      ? `${days.value} days left`
      : 'last day today';
  return fa.value ? `این یک سایت پیش‌نمایش است · ${left}` : `This is a preview site · ${left}`;
});
const cta = computed(() => (fa.value ? 'این سایت را برای خودتان نگه دارید' : 'Keep this site'));
</script>

<template>
  <div
    class="preview-banner relative z-[60] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-slate-900 px-4 py-2 text-center text-sm text-white"
    :dir="fa ? 'rtl' : 'ltr'"
    data-preview-banner
  >
    <span class="mdi mdi-eye-outline" aria-hidden="true" />
    <span>{{ text }}</span>
    <a v-if="preview.home" :href="preview.home" target="_blank" rel="noopener" class="font-semibold underline underline-offset-2">
      {{ cta }}
    </a>
  </div>
</template>
