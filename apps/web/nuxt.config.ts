// https://nuxt.com/docs/api/configuration/nuxt-config
import type { NodeTransform } from '@vue/compiler-core';

/**
 * Adds `v-srcset="[<the img's src>, <its alt>]"` (plugins/srcset.ts) to every <img>, so uploaded photos get
 * responsive sizes, a blurred preview and a fallback description everywhere. They are passed as the directive's
 * value because server rendering gives directives no element to read them from.
 */
const imgSrcset: NodeTransform = (node) => {
  if (node.type !== 1 || node.tag !== 'img') return;
  if (node.props.some((p) => p.name === 'srcset' || (p.type === 7 && p.arg?.type === 4 && p.arg.content === 'srcset'))) return;
  const prop = (name: string) =>
    node.props.find(
      (p) => (p.type === 6 && p.name === name) || (p.type === 7 && p.name === 'bind' && p.arg?.type === 4 && p.arg.content === name),
    );
  const src = prop('src');
  if (!src) return;
  // Bound expressions have already been processed by Vue's own transforms, so they can be reused as they are.
  const expOf = (p: NonNullable<ReturnType<typeof prop>>) =>
    p.type === 7 ? p.exp! : { type: 4, content: JSON.stringify(p.value?.content ?? ''), isStatic: false, constType: 0, loc: p.loc };
  const alt = prop('alt');
  const exp = { type: 8, loc: src.loc, children: ['[', expOf(src), ', ', alt ? expOf(alt) : 'undefined', ']'] };
  const lazy = node.props.some((p) => p.type === 6 && p.name === 'loading' && p.value?.content === 'lazy');
  const modifiers = lazy ? [{ type: 4, content: 'lazy', isStatic: true, constType: 3, loc: node.loc }] : [];
  node.props.push({ type: 7, name: 'srcset', exp, arg: undefined, modifiers, rawName: 'v-srcset', loc: node.loc } as never);
};

const apiTarget = process.env.NUXT_API_INTERNAL ?? 'http://localhost:3001/api';

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],

  vue: {
    compilerOptions: { nodeTransforms: [imgSrcset] },
  },
  // Every theme font is served from the site (no Google Fonts request). @font-face only downloads a font a page uses.
  css: [
    '@mdi/font/css/materialdesignicons.min.css',
    '@fontsource-variable/inter/index.css',
    '@fontsource-variable/vazirmatn/index.css',
    '@fontsource-variable/noto-sans-arabic/index.css',
    '@fontsource-variable/noto-naskh-arabic/index.css',
    '@fontsource-variable/cairo/index.css',
    '@fontsource-variable/rubik/index.css',
    '@fontsource-variable/manrope/index.css',
    '@fontsource-variable/montserrat/index.css',
    '@fontsource-variable/syne/index.css',
    '@fontsource-variable/playfair-display/index.css',
    '@fontsource-variable/space-grotesk/index.css',
    '~/assets/css/main.css',
  ],

  runtimeConfig: {
    // Server-side requests go straight to the API container.
    apiInternal: apiTarget,
    // Rendered public pages are kept in memory and cleared by the API after every change made in the admin
    // (server/utils/page-cache.ts). Off unless NUXT_CACHE_PURGE_TOKEN is set (the same value as the API's).
    cachePurgeToken: '',
    pageCacheSeconds: 600,
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
    },
  },

  build: {
    transpile: ['@profiterol/blocks'],
  },

  // The stylesheet (with every font's @font-face) is one file the browser caches, not repeated in each page,
  // and fonts stay separate files so only the ones a page uses are downloaded.
  features: { inlineStyles: false },
  vite: {
    build: { assetsInlineLimit: (file: string) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined) },
  },
});
