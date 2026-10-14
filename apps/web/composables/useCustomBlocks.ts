import * as Vue from 'vue';
import type { Component } from 'vue';

/** An approved custom block (made with the AI block builder): where its code is, and its default field values. */
export interface CustomBlockScript {
  type: string;
  url: string;
  defaults: Record<string, unknown>;
}

/**
 * The custom blocks the current page (or the editor) may show, by type. The public page fills it from the API's
 * `customBlocks`; the editor from the schema. BlockView reads it for types it has no built-in component for.
 */
export const useCustomBlockScripts = () => useState<Record<string, CustomBlockScript>>('custom-block-scripts', () => ({}));

export function setCustomBlockScripts(list: CustomBlockScript[]) {
  useCustomBlockScripts().value = Object.fromEntries(list.map((s) => [s.type, s]));
}

const loaded = new Map<string, Promise<Component>>();

/**
 * Loads an approved block's module (built by the API, see apps/api/src/custom-blocks/compile.ts). The module is
 * `export default (Vue) => component` plus `export const css`, the block's scoped styles. Browser only: custom block
 * code never runs on the server.
 */
export function loadCustomBlock(url: string): Promise<Component> {
  let found = loaded.get(url);
  if (!found) {
    found = import(/* @vite-ignore */ url).then((mod: { default: (vue: typeof Vue) => Component; css?: string }) => {
      if (mod.css && !document.querySelector(`style[data-custom-block="${CSS.escape(url)}"]`)) {
        const style = document.createElement('style');
        style.dataset.customBlock = url;
        style.textContent = mod.css;
        document.head.appendChild(style);
      }
      return mod.default(Vue);
    });
    // A failed load (offline, a removed version) can be tried again later.
    found.catch(() => loaded.delete(url));
    loaded.set(url, found);
  }
  return found;
}

const asyncComponents = new Map<string, Component>();

/** One async component per module address, so re-renders never reload it. */
export function customBlockComponent(url: string, failed: Component): Component {
  let component = asyncComponents.get(url);
  if (!component) {
    component = Vue.defineAsyncComponent({ loader: () => loadCustomBlock(url), errorComponent: failed, timeout: 20000 });
    asyncComponents.set(url, component);
  }
  return component;
}
