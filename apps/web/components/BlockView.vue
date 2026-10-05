<script setup lang="ts">
import { imageVariant, withDefaults as mergeDefaults, type BlockNode } from '@profiterol/blocks';
import { blockComponents } from './blocks';

const props = defineProps<{
  block: BlockNode;
  locale: string;
  /** In the editor canvas: text becomes editable in place and "Show on" is left to the editor to display. */
  editable?: boolean;
}>();
const emit = defineEmits<{ edit: [path: string, value: string] }>();

if (props.editable) provide(blockEditKey, { update: (path, value) => emit('edit', path, value) });

const merged = computed(() => mergeDefaults(props.block));
const anchor = computed(() => {
  const a = String(merged.value.anchor ?? '').trim();
  return /^[A-Za-z][\w-]*$/.test(a) ? a : undefined;
});

// Container-query classes, so the editor's device preview behaves like a real screen.
const visibility = computed(() => {
  if (props.editable) return '';
  if (merged.value.showOn === 'mobile') return '@3xl:hidden';
  if (merged.value.showOn === 'desktop') return 'hidden @3xl:block';
  return '';
});

const SPACE: Record<string, string> = { sm: '1.5rem', md: '3rem', lg: '6rem', xl: '10rem' };
const WIDTH: Record<string, string> = { wide: '80rem', medium: '60rem', narrow: '45rem' };
const HEX = /^#[0-9a-f]{3,8}$/i;
/** Characters that could end a CSS url("…"); uploads and normal links never contain them. */
const cssUrl = (url: string) => `url("${url.replace(/["'()\\\s]/g, encodeURIComponent)}")`;

/**
 * The block's style options. Colors override the theme's variables inside the block, so its own design picks them
 * up (panels, text, buttons); the background and spacing go on a full-width wrapper around it.
 */
const look = computed(() => {
  const p = merged.value;
  const style: Record<string, string> = {};
  const color = (v: unknown) => (typeof v === 'string' && HEX.test(v) ? v : '');
  if (color(p.bgColor)) Object.assign(style, { '--c-background': p.bgColor, backgroundColor: p.bgColor });
  if (color(p.panelColor)) style['--c-surface'] = p.panelColor as string;
  if (color(p.textColor)) Object.assign(style, { '--c-text': p.textColor, color: p.textColor });
  if (color(p.accentColor)) style['--c-primary'] = p.accentColor as string;
  if (typeof p.bgImage === 'string' && p.bgImage) {
    Object.assign(style, { backgroundImage: cssUrl(imageVariant(p.bgImage, 1600)), backgroundSize: 'cover', backgroundPosition: 'center' });
  }
  if (SPACE[p.spaceTop as string]) style.paddingTop = SPACE[p.spaceTop as string];
  if (SPACE[p.spaceBottom as string]) style.paddingBottom = SPACE[p.spaceBottom as string];
  return style;
});
const maxWidth = computed(() => WIDTH[merged.value.maxWidth as string]);
const isLayout = computed(() => Boolean(props.block.children));
</script>

<template>
  <div :id="anchor" class="scroll-mt-24" :class="visibility" :style="look">
    <!-- A separate element for the entrance animation, so Vue's own class updates never clear it. -->
    <div v-animate="merged.animation" :class="maxWidth ? 'mx-auto' : ''" :style="maxWidth ? { maxWidth } : undefined">
      <component
        :is="blockComponents[block.type]"
        v-if="blockComponents[block.type]"
        :p="merged"
        :locale="locale"
        v-bind="{ ...(block.data ? { data: block.data } : {}), ...(isLayout ? { node: block } : {}) }"
      />
    </div>
  </div>
</template>
