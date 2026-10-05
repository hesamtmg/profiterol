/** `$t('…')` in templates: the admin's translation function (composables/useAdminI18n.ts). */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.globalProperties.$t = translate;
});

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: typeof translate;
  }
}
