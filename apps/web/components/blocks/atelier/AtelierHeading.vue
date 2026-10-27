<script setup lang="ts">
/**
 * The whitecotton.pt heading: a small spaced-out label, then a title whose second part is softer (the theme's second
 * color, and italic in Latin scripts; Persian has no true italic, so it only changes color there).
 */
import EditableText from '../../site/EditableText.vue';

withDefaults(
  defineProps<{
    p: { eyebrow?: string; title?: string; titleItalic?: string };
    size?: 'md' | 'lg' | 'xl';
    tag?: string;
    center?: boolean;
  }>(),
  { size: 'lg', tag: 'h2', center: false },
);
const editing = Boolean(useBlockEditing());
const sizes = {
  md: 'text-[clamp(2rem,5.5cqw,3.25rem)]',
  lg: 'text-[clamp(2.25rem,6.5cqw,4.5rem)]',
  xl: 'text-[clamp(2.75rem,8cqw,6.5rem)]',
};
</script>

<template>
  <div :class="center ? 'text-center' : ''">
    <p v-if="p.eyebrow || editing" class="mb-5 text-[0.7rem] font-medium uppercase tracking-[0.32em] opacity-60">
      <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
    </p>
    <component :is="tag" class="font-medium leading-[1.02] tracking-[-0.035em]" :class="sizes[size]">
      <EditableText :value="p.title" path="title" placeholder="Title" />
      <template v-if="p.titleItalic || editing">
        {{ ' '
        }}<em class="font-normal text-secondary rtl:not-italic"
          ><EditableText :value="p.titleItalic" path="titleItalic" placeholder="soft part"
        /></em>
      </template>
    </component>
  </div>
</template>
