<script setup lang="ts">
/** Blocks that share one background, spacing and width (set in the group's style options). */
import type { BlockNode } from '@profiterol/blocks';
import BlockView from '../../BlockView.vue';

defineProps<{ p: Record<string, unknown>; locale: string; node: BlockNode }>();
const columnEditor = inject(columnEditorKey, null);
</script>

<template>
  <div class="@container">
    <component :is="columnEditor" v-if="columnEditor" :parent="node" :column="0" />
    <BlockView v-for="child in node.children?.[0] ?? []" v-else :key="child.id" :block="child" :locale="locale" />
  </div>
</template>
