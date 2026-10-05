// https://nuxt.com/docs/api/configuration/nuxt-config
import type { NodeTransform } from '@vue/compiler-core';

/**
 * Adds `v-srcset="<the img's src>"` (plugins/srcset.ts) to every <img>, so uploaded photos get responsive sizes
 * everywhere. The src is passed as the directive's value because server rendering gives directives no element.
 */
const imgSrcset: NodeTransform = (node) => {
  if (node.type !== 1 || node.tag !== 'img') return;
  if (node.props.some((p) => p.name === 'srcset' || (p.type === 7 && p.arg?.type === 4 && p.arg.content === 'srcset'))) return;
  const src = node.props.find((p) => (p.type === 6 && p.name === 'src') || (p.type === 7 && p.name === 'bind' && p.arg?.type === 4 && p.arg.content === 'src'));
  if (!src) return;
  // A bound src's expression has already been processed by Vue's own transforms, so it can be reused as is.
  const exp =
    src.type === 7
      ? src.exp
      : { type: 4, content: JSON.stringify(src.value?.content ?? ''), isStatic: false, constType: 0, loc: src.loc };
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
