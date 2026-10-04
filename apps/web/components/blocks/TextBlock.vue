<script setup lang="ts">
import EditableText from '../site/EditableText.vue';

const props = defineProps<{ p: { title: string; body: string; align: string } }>();
// In the editor the body is one editable area; blank lines still separate paragraphs.
const editing = Boolean(useBlockEditing());
const paragraphs = computed(() =>
  (props.p.body ?? '')
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean),
);
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div class="panel px-6 py-10 @3xl:px-20 @3xl:py-16" :class="p.align === 'center' ? 'text-center' : 'text-start'">
      <h2 v-if="p.title || editing" class="text-2xl font-black @3xl:text-4xl"><EditableText :value="p.title" path="title" placeholder="Heading" /></h2>
      <div class="mt-4 space-y-4 text-base font-extralight leading-loose @3xl:text-lg" :class="{ 'mx-auto max-w-3xl': p.align === 'center' }">
        <p v-if="editing"><EditableText :value="p.body" path="body" multiline /></p>
        <p v-for="(para, i) in paragraphs" v-else :key="i" class="whitespace-pre-line">{{ para }}</p>
      </div>
    </div>
  </section>
</template>
