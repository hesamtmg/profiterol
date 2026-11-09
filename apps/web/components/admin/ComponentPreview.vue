<script setup lang="ts">
/**
 * A block drawn with its default content, as it would look on a real page, shrunk to fit its box. It renders only
 * once scrolled into view, so a page with every block stays quick. Clicks inside never reach the block.
 */
import { createBlock } from '@profiterol/blocks';
import BlockView from '~/components/BlockView.vue';

const props = withDefaults(
  defineProps<{
    type: string;
    /** The site theme as CSS variables (themeToCss). */
    themeCss: string;
    locale: string;
    dir: 'ltr' | 'rtl';
    /** The width the block is laid out at, before shrinking: 1280 desktop, 820 tablet, 390 phone. */
    width?: number;
    /** The tallest the box gets; taller blocks are cut off (0: show it all). */
    maxHeight?: number;
  }>(),
  { width: 1280, maxHeight: 0 },
);

const box = ref<HTMLElement | null>(null);
const inner = ref<HTMLElement | null>(null);
const visible = ref(false);
const scale = ref(0.25);
const height = ref(0);
const failed = ref(false);

const block = computed(() => {
  try {
    return createBlock(props.type);
  } catch {
    return null;
  }
});

let seen: IntersectionObserver | undefined;
let resize: ResizeObserver | undefined;

function measure() {
  if (!box.value) return;
  scale.value = box.value.clientWidth / props.width;
  height.value = (inner.value?.offsetHeight ?? 0) * scale.value;
}

onMounted(() => {
  seen = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        visible.value = true;
        seen?.disconnect();
      }
    },
    { rootMargin: '400px' },
  );
  if (box.value) seen.observe(box.value);
  resize = new ResizeObserver(measure);
  if (box.value) resize.observe(box.value);
});

watch(inner, (el) => {
  if (el) resize?.observe(el);
  measure();
});
watch(
  () => props.width,
  () => nextTick(measure),
);

onErrorCaptured(() => {
  failed.value = true;
  return false;
});

onBeforeUnmount(() => {
  seen?.disconnect();
  resize?.disconnect();
});

const shown = computed(() => (props.maxHeight ? Math.min(height.value, props.maxHeight) : height.value));
</script>

<template>
  <div
    ref="box"
    class="relative w-full overflow-hidden bg-white"
    :style="{ height: `${visible && height ? shown : maxHeight || 240}px` }"
    data-testid="component-preview"
  >
    <div v-if="!visible || !block" class="absolute inset-0 animate-pulse bg-slate-100" aria-hidden="true" />
    <p v-else-if="failed" class="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
      {{ $t('No preview for this block.') }}
    </p>
    <!-- Layout blocks start empty: show where their blocks go. -->
    <div v-else-if="block.children" class="absolute inset-0 flex gap-3 p-6" :dir="dir" aria-hidden="true">
      <div
        v-for="(_, i) in block.children"
        :key="i"
        class="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-400"
      >
        {{ $t('Blocks go here') }}
      </div>
    </div>
    <ClientOnly v-else>
      <div
        ref="inner"
        class="site @container pointer-events-none absolute left-0 top-0 origin-top-left select-none"
        :style="`width:${width}px;transform:scale(${scale});${themeCss}`"
        :dir="dir"
        :lang="locale"
        inert
        aria-hidden="true"
      >
        <BlockView :block="block" :locale="locale" />
      </div>
    </ClientOnly>
    <div
      v-if="maxHeight && height > maxHeight"
      class="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/90 to-transparent"
    />
  </div>
</template>
