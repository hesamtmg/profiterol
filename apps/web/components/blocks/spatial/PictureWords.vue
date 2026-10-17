<script setup lang="ts">
/**
 * Big centered lines that rise in one after another; between the words of a line sits a small picture or a shape
 * in the main color turning slowly, as big as a letter ("Ideas ✳ become spaces.").
 */
import EditableText from '../../site/EditableText.vue';
import SpatialShape from './SpatialShape.vue';

interface Line {
  before: string;
  media: string;
  shape: string;
  image: string;
  after: string;
}

defineProps<{ p: { lines: Line[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
</script>

<template>
  <section class="bg-surface px-5 py-24 text-center text-ink @3xl:px-10 @3xl:py-40">
    <h2 class="mx-auto max-w-[80rem] text-[clamp(2.1rem,6cqw,6rem)] font-semibold leading-[1.12] tracking-tight">
      <span v-for="(line, i) in p.lines" :key="i" v-reveal="{ delay: i * 140 }" class="block">
        <EditableText :value="line.before" :path="`lines.${i}.before`" placeholder="Words" />
        <template v-if="line.media === 'shape'">
          {{ ' '
          }}<span class="mx-[0.12em] inline-block h-[0.95em] w-[0.95em] align-[-0.12em] text-primary"
            ><SpatialShape :shape="line.shape" :spin="!editing" :seconds="12"
          /></span>
        </template>
        <template v-else-if="line.media === 'image'">
          {{ ' '
          }}<span class="mx-[0.12em] inline-block h-[0.95em] w-[1.5em] overflow-hidden rounded-[0.08em] align-[-0.12em]">
            <img v-if="line.image" :src="line.image" alt="" class="h-full w-full object-cover" loading="lazy" />
            <span v-else class="photo-placeholder block h-full w-full" />
          </span>
        </template>
        <template v-if="line.after || editing">
          {{ ' ' }}<EditableText :value="line.after" :path="`lines.${i}.after`" placeholder="Words" />
        </template>
      </span>
    </h2>
  </section>
</template>
