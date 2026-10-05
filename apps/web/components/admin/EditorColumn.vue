<script setup lang="ts">
/** A column of a Columns or Group block in the editor: blocks can be dragged in, out and between columns. */
import type { BlockNode } from '@profiterol/blocks';
import draggable from 'vuedraggable';
import EditorBlockFrame from './EditorBlockFrame.vue';

const props = defineProps<{ parent: BlockNode; column: number }>();
const ctx = useEditorContext();
const list = computed({
  get: () => props.parent.children?.[props.column] ?? [],
  set: (value: BlockNode[]) => ctx.setColumn(props.parent, props.column, value),
});
const put = canDropIntoColumn;
const targeted = computed(() => ctx.insertTarget.value?.parentId === props.parent.id && ctx.insertTarget.value.column === props.column);
</script>

<template>
  <draggable
    v-model="list"
    item-key="id"
    :group="{ name: 'blocks', put }"
    handle=".drag-handle-nested"
    :animation="200"
    ghost-class="opacity-40"
    class="min-h-24"
    data-column
    @add="(e: { newIndex: number }) => ctx.onAdded(list, e.newIndex)"
  >
    <template #item="{ element }">
      <EditorBlockFrame :block="element" nested />
    </template>
    <template #footer>
      <button
        type="button"
        class="m-2 flex w-[calc(100%-1rem)] items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-3 text-xs font-medium transition"
        :class="[
          list.length ? 'h-10 opacity-0 hover:opacity-100 focus:opacity-100' : 'h-28',
          targeted
            ? 'border-violet-500 bg-violet-50 text-violet-700 opacity-100'
            : 'border-slate-300/80 text-slate-400 hover:border-violet-400 hover:text-violet-600',
        ]"
        @click.stop="ctx.addInto(parent, column)"
      >
        <i class="mdi mdi-plus" /> {{ targeted ? $t('Now pick a block on the left') : $t('Add a block to this column') }}
      </button>
    </template>
  </draggable>
</template>
