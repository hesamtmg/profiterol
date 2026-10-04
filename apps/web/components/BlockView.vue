<script setup lang="ts">
import { withDefaults as mergeDefaults, type BlockNode } from '@profiterol/blocks';
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
</script>

<template>
  <div :id="anchor" class="scroll-mt-24" :class="visibility">
    <component
      :is="blockComponents[block.type]"
      v-if="blockComponents[block.type]"
      :p="merged"
      :locale="locale"
      v-bind="block.data ? { data: block.data } : {}"
    />
  </div>
</template>
