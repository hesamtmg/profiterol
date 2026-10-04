<script setup lang="ts">
import EditableText from '../site/EditableText.vue';
const props = defineProps<{ p: { text: string; seconds: number }; bare?: boolean; textPath?: string }>();
// In the editor the text holds still so it can be edited.
const editing = Boolean(useBlockEditing());
</script>

<template>
  <component :is="bare ? 'div' : 'section'" :class="bare ? '' : 'px-3 py-3 @3xl:px-6'">
    <div class="overflow-hidden" :class="bare ? 'pt-4' : 'panel py-6'" dir="ltr" aria-hidden="true">
      <!-- The leading padding starts the text off-screen; translating by -100% scrolls all of it out. -->
      <div
        class="animate-marquee inline-block whitespace-nowrap ps-[100%] text-5xl font-extralight text-slate-300 @3xl:text-8xl"
        :class="{ '!ps-0': editing }"
        :style="editing ? {} : { animation: `marquee ${Math.max(5, Number(p.seconds) || 30)}s linear infinite` }"
      >
        <EditableText :value="p.text" :path="props.textPath ?? 'text'" />
      </div>
    </div>
  </component>
</template>
