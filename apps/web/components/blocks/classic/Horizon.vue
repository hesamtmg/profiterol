<script setup lang="ts">
/** minicms kind 3: a full-width photo, blurred behind a centered title and text. */
import EditableText from '../../site/EditableText.vue';
import ResponsiveImg from '../../site/ResponsiveImg.vue';

const props = defineProps<{ p: { image: string; mobileImage: string; title: string; text: string; blur: boolean }; locale: string }>();
const editing = Boolean(useBlockEditing());
const hasText = computed(() => Boolean(props.p.title || props.p.text || editing));
</script>

<template>
  <section class="relative isolate flex min-h-[70dvh] w-full items-center overflow-hidden bg-black text-white @3xl:min-h-[90dvh]">
    <div
      class="absolute inset-0 -z-10"
      :class="{ 'scale-110': p.blur && hasText }"
      :style="p.blur && hasText ? { filter: 'blur(9px)' } : undefined"
    >
      <ResponsiveImg v-if="p.image || p.mobileImage" :src="p.image" :mobile="p.mobileImage" img-class="h-full w-full object-cover" />
      <div v-else class="photo-placeholder h-full w-full" />
    </div>
    <div v-if="hasText" class="absolute inset-0 -z-10 bg-black/25" />

    <div v-if="hasText" class="w-full px-10 py-16 text-center font-semibold @3xl:px-24 @3xl:py-32">
      <h2 v-reveal class="text-3xl @3xl:text-5xl"><EditableText :value="p.title" path="title" placeholder="Title" /></h2>
      <p
        v-reveal="{ delay: 100 }"
        class="mx-auto mt-6 max-w-5xl text-xl font-extralight leading-relaxed [text-align-last:center] @3xl:text-3xl"
        style="text-align: justify"
      >
        <EditableText :value="p.text" path="text" multiline />
      </p>
    </div>
  </section>
</template>
