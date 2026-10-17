<script setup lang="ts">
/**
 * A panel with a huge title and a smaller line under it, then a row of cut-out shapes wider than the screen, each
 * turning slowly (every other one the other way) while the whole row drifts sideways as the visitor scrolls past,
 * and a short centered text. Shapes without a color take the theme's main and second colors in turn.
 */
import EditableText from '../../site/EditableText.vue';
import SpatialShape from './SpatialShape.vue';

defineProps<{
  p: { title: string; subtitle: string; shapes: { shape: string; color: string }[]; text: string; look: string };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const still = computed(() => editing || reduced.value);
const row = ref<HTMLElement | null>(null);
const progress = useScrollProgress(row, (rect, vh) => (vh - rect.top) / (vh + rect.height), 0.5);
const drift = computed(() => (still.value ? 0 : (0.5 - progress.value) * 30));

const color = (c: string, i: number) => (/^#[0-9a-f]{3,8}$/i.test(c) ? c : i % 2 ? 'var(--c-secondary)' : 'var(--c-primary)');
</script>

<template>
  <section class="overflow-hidden py-24 text-center @3xl:py-36" :class="p.look === 'light' ? 'bg-surface text-ink' : 'bg-dark text-white'">
    <h2 v-reveal class="px-5 text-[clamp(2.75rem,10cqw,9.5rem)] font-bold uppercase leading-[0.95] tracking-tight">
      <EditableText :value="p.title" path="title" placeholder="Title" />
    </h2>
    <p v-if="p.subtitle || editing" v-reveal="{ delay: 120 }" class="mt-4 px-5 text-[clamp(1.25rem,3cqw,2.6rem)] font-medium">
      <EditableText :value="p.subtitle" path="subtitle" placeholder="Subtitle" />
    </p>

    <div ref="row" class="my-16 @3xl:my-24" dir="ltr" aria-hidden="true">
      <div
        class="flex w-[130%] items-center justify-between gap-[3cqw] transition-transform duration-300 ease-out"
        :style="{ transform: `translateX(calc(-11.5% + ${drift}%))` }"
      >
        <div
          v-for="(item, i) in p.shapes"
          :key="i"
          class="aspect-square w-[clamp(5rem,15cqw,15rem)] shrink-0"
          :style="{ color: color(item.color, i) }"
        >
          <SpatialShape :shape="item.shape" :spin="!still" :reverse="i % 2 === 1" :seconds="16 + (i % 3) * 5" />
        </div>
      </div>
    </div>

    <p v-if="p.text || editing" v-reveal class="mx-auto max-w-2xl px-5 text-lg font-medium leading-snug @3xl:text-2xl">
      <EditableText :value="p.text" path="text" multiline placeholder="Text" />
    </p>
  </section>
</template>
