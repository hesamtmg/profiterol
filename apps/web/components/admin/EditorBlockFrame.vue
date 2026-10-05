<script setup lang="ts">
/**
 * One block on the editor canvas: click to select, a toolbar to move, copy or delete it, drop a photo onto it,
 * and a + to add a block after it. Used for blocks on the page and for blocks inside columns (`nested`).
 */
import { getBlock, type BlockNode } from '@profiterol/blocks';
import BlockView from '../BlockView.vue';

const props = defineProps<{ block: BlockNode; nested?: boolean }>();
const ctx = useEditorContext();
const selected = computed(() => ctx.selectedId.value === props.block.id);
const label = computed(() => translate(getBlock(props.block.type)?.label ?? props.block.type));
</script>

<template>
  <div
    :id="`blk-${block.id}`"
    :data-type="block.type"
    class="relative cursor-pointer"
    :class="[
      nested ? 'group/nested outline-offset-[-2px]' : 'group/blk outline-offset-[-4px]',
      selected
        ? `z-10 outline ${nested ? 'outline-2 outline-violet-500' : 'outline-4 outline-sky-500'}`
        : nested
          ? 'hover:outline hover:outline-2 hover:outline-violet-400/70'
          : 'hover:outline hover:outline-2 hover:outline-sky-400/70',
    ]"
    @click.stop="ctx.select(block.id)"
    @dragover.stop="ctx.onBlockDragOver(block, $event)"
    @drop.stop="ctx.onBlockDrop(block, $event)"
  >
    <div
      class="absolute z-20 items-center gap-0.5 rounded-full p-1 text-white shadow-xl"
      :class="[
        // A layout block's toolbar sits on its top edge, clear of the toolbars of the blocks inside it.
        nested ? 'start-2 top-2 bg-violet-700' : block.children ? 'start-6 -top-4 bg-slate-900' : 'start-6 top-6 bg-slate-900',
        selected ? 'flex' : nested ? 'hidden group-hover/nested:flex' : 'hidden group-hover/blk:flex',
      ]"
      dir="ltr"
      @click.stop="ctx.select(block.id)"
    >
      <span
        class="flex cursor-grab items-center gap-1 px-2 text-xs font-medium"
        :class="nested ? 'drag-handle-nested' : 'drag-handle'"
        :title="$t('Drag to move')"
      >
        <i class="mdi mdi-drag text-base" /> {{ label }}
      </span>
      <button
        type="button"
        class="btn-icon !h-7 !w-7 !text-white hover:!bg-white/15"
        :title="$t('Move up')"
        @click.stop="ctx.move(block.id, -1)"
      >
        <i class="mdi mdi-arrow-up" />
      </button>
      <button
        type="button"
        class="btn-icon !h-7 !w-7 !text-white hover:!bg-white/15"
        :title="$t('Move down')"
        @click.stop="ctx.move(block.id, 1)"
      >
        <i class="mdi mdi-arrow-down" />
      </button>
      <button
        type="button"
        class="btn-icon !h-7 !w-7 !text-white hover:!bg-white/15"
        :title="$t('Duplicate')"
        @click.stop="ctx.duplicate(block.id)"
      >
        <i class="mdi mdi-content-copy" />
      </button>
      <button
        type="button"
        class="btn-icon !h-7 !w-7 !text-white hover:!bg-red-500"
        :title="$t('Delete')"
        @click.stop="ctx.remove(block.id)"
      >
        <i class="mdi mdi-trash-can-outline" />
      </button>
    </div>
    <span
      v-if="block.props.showOn"
      class="absolute z-20 rounded-full bg-amber-300 px-3 py-1 text-[11px] font-medium text-amber-950 shadow"
      :class="nested ? 'end-2 top-2' : 'end-6 top-6'"
      dir="ltr"
    >
      <i class="mdi" :class="block.props.showOn === 'mobile' ? 'mdi-cellphone' : 'mdi-monitor'" />
      {{ block.props.showOn === 'mobile' ? $t('Phones only') : $t('Tablets and desktops only') }}
    </span>
    <div :class="{ 'opacity-30 grayscale': ctx.hiddenOnDevice(block) }">
      <BlockView :block="block" :locale="ctx.locale.value" editable @edit="(path, value) => ctx.inlineEdit(block, path, value)" />
    </div>
    <div
      v-if="ctx.dropTarget.value === block.id"
      class="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-card border-4 border-dashed border-sky-400 bg-sky-500/20 text-lg font-bold text-white"
    >
      <span class="rounded-full bg-sky-600 px-5 py-2 shadow-lg">
        <i class="mdi" :class="ctx.dropKind.value === 'video' ? 'mdi-movie-plus' : 'mdi-image-plus'" />
        {{ $t('Drop to use as {field}', { field: ctx.imageLabel(block) }) }}
      </span>
    </div>
    <button
      type="button"
      class="absolute bottom-0 left-1/2 z-20 hidden h-8 w-8 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full text-white shadow-lg"
      :class="nested ? 'bg-violet-600 group-hover/nested:flex' : 'bg-sky-500 group-hover/blk:flex'"
      :title="$t('Add a block below')"
      @click.stop="ctx.addAfter(block.id)"
    >
      <i class="mdi mdi-plus" />
    </button>
  </div>
</template>
