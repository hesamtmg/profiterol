<script setup lang="ts">
/**
 * Blocks side by side. Each column is its own container, so the blocks in it lay themselves out for the column's
 * width (as they would on a phone when the column is narrow). Columns stack below the chosen screen width.
 */
import type { BlockNode } from '@profiterol/blocks';
import BlockView from '../../BlockView.vue';

const props = defineProps<{
  p: { count: string; ratio: string; gap: string; valign: string; stack: string };
  locale: string;
  node: BlockNode;
}>();

// Written out in full so Tailwind finds every class.
const GRID: Record<string, Record<string, string>> = {
  phone: {
    '2-equal': '@2xl:grid-cols-2',
    '2-wide-start': '@2xl:grid-cols-[2fr_1fr]',
    '2-wide-end': '@2xl:grid-cols-[1fr_2fr]',
    3: '@2xl:grid-cols-3',
    4: '@2xl:grid-cols-2 @5xl:grid-cols-4',
  },
  tablet: {
    '2-equal': '@5xl:grid-cols-2',
    '2-wide-start': '@5xl:grid-cols-[2fr_1fr]',
    '2-wide-end': '@5xl:grid-cols-[1fr_2fr]',
    3: '@5xl:grid-cols-3',
    4: '@5xl:grid-cols-4',
  },
};
const GAP: Record<string, string> = { none: 'gap-0', sm: 'gap-2', md: 'gap-6', lg: 'gap-12' };
const ALIGN: Record<string, string> = { start: 'items-start', center: 'items-center', end: 'items-end' };

const grid = computed(() => {
  const count = props.node.children?.length ?? 2;
  const key = count === 2 ? `2-${props.p.ratio}` : String(count);
  return [GRID[props.p.stack]?.[key] ?? GRID.phone[key], GAP[props.p.gap] ?? GAP.md, ALIGN[props.p.valign] ?? ALIGN.start];
});
const columnEditor = inject(columnEditorKey, null);
</script>

<template>
  <div class="@container">
    <div class="grid grid-cols-1" :class="grid">
      <div v-for="(column, i) in node.children ?? []" :key="i" class="@container min-w-0">
        <component :is="columnEditor" v-if="columnEditor" :parent="node" :column="i" />
        <BlockView v-for="child in column" v-else :key="child.id" :block="child" :locale="locale" />
      </div>
    </div>
  </div>
</template>
