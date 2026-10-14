/** `$t('…')` in templates: the admin's translation function (composables/useAdminI18n.ts). */
export default defineNuxtPlugin(async (nuxtApp) => {
  nuxtApp.vueApp.config.globalProperties.$t = translate;

  // The admin opens in the site's admin language (set by the owner), so it is known before the first screen shows.
  if (import.meta.client && useRoute().path.startsWith('/admin')) {
    const settings = await useApi()<{ adminLang?: string }>('/public/settings').catch(() => null);
    applySiteAdminLang(settings?.adminLang);
  }
});

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: typeof translate;
  }
}
