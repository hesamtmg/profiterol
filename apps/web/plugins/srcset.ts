/**
 * `v-srcset` gives an uploaded photo a `srcset` of its WebP sizes (made by the API on upload), so phones
 * download a small file and big screens a sharp one. It is added to every <img> at compile time
 * (nuxt.config → vue.compilerOptions.nodeTransforms), so blocks just write <img :src="…">.
 * Lazy images use `sizes="auto"` (the browser measures the image); others assume the full screen width.
 */
import { imageSrcset } from '@profiterol/blocks';

function attrs(src: unknown, loading: unknown) {
  const srcset = imageSrcset(src);
  return srcset ? { srcset, sizes: loading === 'lazy' ? 'auto, 100vw' : '100vw' } : null;
}

function apply(el: HTMLImageElement) {
  const a = attrs(el.getAttribute('src'), el.getAttribute('loading'));
  if (a) {
    // sizes before srcset, so the browser never picks a size with the wrong hint.
    el.sizes = a.sizes;
    el.srcset = a.srcset;
  } else if (el.hasAttribute('srcset')) {
    el.removeAttribute('srcset');
    el.removeAttribute('sizes');
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive<HTMLImageElement>('srcset', {
    getSSRProps: ({ value, modifiers }) => attrs(value, modifiers.lazy ? 'lazy' : '') ?? {},
    mounted: apply,
    updated: apply,
  });
});
