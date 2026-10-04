// https://nuxt.com/docs/api/configuration/nuxt-config
const apiTarget = process.env.NUXT_API_INTERNAL ?? 'http://localhost:3001/api';

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['@mdi/font/css/materialdesignicons.min.css', '~/assets/css/main.css'],

  runtimeConfig: {
    // Server-side requests go straight to the API container.
    apiInternal: apiTarget,
    public: {
      // Browser requests go through nginx (or the dev proxy below).
      apiBase: '/api',
    },
  },

  // The admin is a client-side app; the public site is server-rendered.
  routeRules: {
    '/admin': { ssr: false },
    '/admin/**': { ssr: false },
  },

  // Without nginx (local `nuxt dev`), forward API and upload requests to Nest.
  nitro: {
    devProxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/uploads': { target: apiTarget.replace(/\/api$/, '/uploads'), changeOrigin: true },
    },
  },

  app: {
    head: {
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@200;400;500;900&family=Vazirmatn:wght@200;400;500;900&display=swap',
        },
      ],
    },
  },

  build: {
    transpile: ['@profiterol/blocks'],
  },
});
