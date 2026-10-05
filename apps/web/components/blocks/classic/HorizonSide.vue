<script setup lang="ts">
/**
 * minicms kinds 5 and 6: a tall photo covering two fifths of the width, with a title and text beside it
 * that slide in as you scroll. `side` says where the photo goes.
 */
import { getLocale } from '@profiterol/blocks';
import EditableText from '../../site/EditableText.vue';
import ResponsiveImg from '../../site/ResponsiveImg.vue';

const props = defineProps<{
  p: { image: string; mobileImage: string; title: string; text: string };
  locale: string;
  side: 'left' | 'right';
}>();
const dir = computed(() => getLocale(props.locale)?.dir ?? 'ltr');
</script>

<template>
  <section
    class="flex min-h-[60dvh] w-full items-stretch overflow-x-clip bg-surface text-ink @3xl:min-h-[90dvh]"
    :class="{ 'flex-row-reverse': side === 'right' }"
    dir="ltr"
  >
    <div v-reveal="{ from: side }" class="relative w-2/5 shrink-0">
      <ResponsiveImg
        v-if="p.image || p.mobileImage"
        :src="p.image"
        :mobile="p.mobileImage"
        img-class="absolute inset-0 h-full w-full object-cover"
      />
      <div v-else class="photo-placeholder absolute inset-0" />
    </div>

    <!-- As in minicms, the title sits next to the photo and the text on the far side. -->
    <div
      class="grid flex-1 content-center gap-4 px-5 py-10 @3xl:gap-10 @3xl:py-32"
      :class="side === 'right' ? '@3xl:grid-cols-[5fr_4fr] @3xl:pl-[4%]' : '@3xl:grid-cols-[4fr_5fr] @3xl:pr-[10%]'"
    >
      <h2
        v-reveal
        :class="side === 'right' ? '@3xl:order-2' : ''"
        class="self-center text-lg font-semibold @3xl:px-5 @3xl:text-3xl"
        :dir="dir"
      >
        <EditableText :value="p.title" path="title" placeholder="Title" />
      </h2>
      <p
        v-reveal="{ delay: 150 }"
        class="self-center text-xs font-extralight leading-relaxed @3xl:text-lg"
        style="text-align: justify"
        :dir="dir"
      >
        <EditableText :value="p.text" path="text" multiline />
      </p>
    </div>
  </section>
</template>
