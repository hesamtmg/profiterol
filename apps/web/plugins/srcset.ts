/**
 * `v-srcset` gives an uploaded photo a `srcset` of its WebP sizes (made by the API on upload), so phones
 * download a small file and big screens a sharp one. It is added to every <img> at compile time
 * (nuxt.config → vue.compilerOptions.nodeTransforms) with the image's `src` and `alt`, so blocks just
 * write <img :src="…">. Lazy images use `sizes="auto"` (the browser measures the image); others assume the
 * full screen width.
 *
 * From the page's media hints it also shows a blurred preview until the photo has loaded, and fills in the
 * media library's description when the block gives the image none.
 */
import { imageSrcset } from '@profiterol/blocks';
import type { MediaHints } from '~/composables/useMediaHints';

type Value = [src: unknown, alt: unknown] | unknown;

const split = (value: Value): [unknown, unknown] => (Array.isArray(value) ? [value[0], value[1]] : [value, undefined]);

function attrs(value: Value, lazy: boolean, hints: MediaHints, withPreview: boolean) {
  const [src, alt] = split(value);
  const out: Record<string, string> = {};
  const srcset = imageSrcset(src);
  if (srcset) Object.assign(out, { srcset, sizes: lazy ? 'auto, 100vw' : '100vw' });
  const hint = typeof src === 'string' ? hints[src] : undefined;
  if (hint?.alt && !alt) out.alt = hint.alt;
  if (hint?.blur && withPreview) out.style = `background-image:url("${hint.blur}");background-size:cover;background-position:center`;
  return out;
}

export default defineNuxtPlugin((nuxtApp) => {
  const hints = useMediaHints();

  function apply(el: HTMLImageElement, value: Value) {
    const a = attrs(value, el.getAttribute('loading') === 'lazy', hints.value, false);
    if (a.srcset) {
      // sizes before srcset, so the browser never picks a size with the wrong hint.
      el.sizes = a.sizes;
      el.srcset = a.srcset;
    } else if (el.hasAttribute('srcset')) {
      el.removeAttribute('srcset');
      el.removeAttribute('sizes');
    }
    if (a.alt && !el.alt) el.alt = a.alt;
  }

  /** The preview sits behind the photo until it loads, then goes (it would show around transparent or contained images). */
  function clearPreview(el: HTMLImageElement) {
    const done = () => el.style.removeProperty('background-image');
    if (el.complete) done();
    else el.addEventListener('load', done, { once: true });
  }

  nuxtApp.vueApp.directive<HTMLImageElement, Value>('srcset', {
    getSSRProps: ({ value, modifiers }) => attrs(value, Boolean(modifiers.lazy), hints.value, true),
    mounted(el, { value }) {
      apply(el, value);
      clearPreview(el);
    },
    updated: (el, { value }) => apply(el, value),
  });
});
