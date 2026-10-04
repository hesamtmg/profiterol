<script setup lang="ts">
import { withDefaults as mergeDefaults, type BlockNode } from '@profiterol/blocks';
import { blockComponents } from './blocks';

const props = defineProps<{ block: BlockNode; locale: string }>();
const merged = computed(() => mergeDefaults(props.block));
const anchor = computed(() => {
  const a = String(merged.value.anchor ?? '').trim();
  return /^[A-Za-z][\w-]*$/.test(a) ? a : undefined;
});
</script>

<template>
  <div :id="anchor" class="scroll-mt-24">
    <component :is="blockComponents[block.type]" v-if="blockComponents[block.type]" :p="merged" :locale="locale" />
  </div>
</template>
