<script setup lang="ts">
/**
 * Giant chunky words on the main color, one letter swapped for a spinning shape (the "O" of "TOUCH"); each letter
 * hops when pointed at (in Persian and other joined scripts, each word, with the shape between words). The bottom edge can be a row of waves melting into a dark block below, like the footer.
 */
import EditableText from '../../site/EditableText.vue';
import SpatialShape from './SpatialShape.vue';

const props = defineProps<{
  p: { title: string; letter: string; shape: string; link: string; wave: boolean; look: string };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());

const colors = computed(() => ({ second: 'bg-secondary text-dark', dark: 'bg-dark text-primary' })[props.p.look] ?? 'bg-primary text-dark');

/** The words as letters; the first match of the chosen letter (any case) becomes the shape. */
const letters = computed(() => {
  const chars = Array.from(props.p.title);
  const wanted = Array.from(props.p.letter.trim())[0]?.toLocaleLowerCase();
  const swap = wanted ? chars.findIndex((c) => c.toLocaleLowerCase() === wanted) : -1;
  return chars.map((char, i) => ({ char, shape: i === swap }));
});
/** Words stay whole when the line breaks. */
const words = computed(() => {
  const out: { char: string; shape: boolean; i: number }[][] = [[]];
  letters.value.forEach((l, i) => {
    if (l.char === ' ') out.push([]);
    else out[out.length - 1].push({ ...l, i });
  });
  return out.filter((w) => w.length);
});
/**
 * Persian, Arabic and other joined scripts lose their joins when every letter is its own box, so there the words stay
 * whole (each word hops) and the shape sits between the first and second word instead of replacing a letter.
 */
const joined = computed(() => /[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Nko}\p{Script=Mongolian}]/u.test(props.p.title));
const joinedWords = computed(() => props.p.title.split(/\s+/).filter(Boolean));
const joinedShapeAt = computed(() => (props.p.letter.trim() ? Math.min(1, joinedWords.value.length) : -1));
/** Ten round bumps along the bottom, filled in the dark color. */
const wavePath = `M0 40 V30 ${Array.from({ length: 10 }, (_, i) => {
  const x = i * 100;
  return `C ${x + 30} 30, ${x + 25} 0, ${x + 50} 0 S ${x + 70} 30, ${x + 100} 30`;
}).join(' ')} V40 Z`;
const href = computed(() => (props.p.link && !editing ? resolveHref(props.p.link, props.locale) : undefined));
</script>

<template>
  <section class="relative overflow-hidden" :class="colors">
    <component
      :is="href ? 'a' : 'div'"
      :href="href"
      :aria-label="href ? p.title : undefined"
      class="block px-5 pb-36 pt-24 text-center @3xl:pb-56 @3xl:pt-36"
    >
      <h2 v-if="editing" class="wave-words font-black uppercase leading-[0.9] tracking-tight">
        <EditableText :value="p.title" path="title" placeholder="Words" />
      </h2>
      <h2
        v-else-if="joined"
        class="wave-words mx-auto flex max-w-[11em] flex-wrap items-center justify-center gap-x-[0.28em] font-black leading-[1.15]"
      >
        <span class="sr-only">{{ p.title }}</span>
        <template v-for="(word, w) in joinedWords" :key="w">
          <span v-if="w === joinedShapeAt" class="hop inline-block h-[0.74em] w-[0.74em]" aria-hidden="true">
            <SpatialShape :shape="p.shape" spin :seconds="10" />
          </span>
          <span class="hop inline-block" aria-hidden="true">{{ word }}</span>
        </template>
        <span v-if="joinedShapeAt === joinedWords.length" class="hop inline-block h-[0.74em] w-[0.74em]" aria-hidden="true">
          <SpatialShape :shape="p.shape" spin :seconds="10" />
        </span>
      </h2>
      <h2 v-else class="wave-words mx-auto flex max-w-[11em] flex-wrap justify-center gap-x-[0.28em] font-black uppercase leading-[0.9]">
        <span class="sr-only">{{ p.title }}</span>
        <span v-for="(word, w) in words" :key="w" class="flex" aria-hidden="true">
          <span v-for="l in word" :key="l.i" class="hop inline-block">
            <span v-if="l.shape" class="inline-block h-[0.74em] w-[0.74em] align-[-0.02em]">
              <SpatialShape :shape="p.shape" spin :seconds="10" />
            </span>
            <template v-else>{{ l.char }}</template>
          </span>
        </span>
      </h2>
    </component>

    <svg
      v-if="p.wave"
      class="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full text-dark @3xl:h-14"
      preserveAspectRatio="none"
      viewBox="0 0 1000 40"
      aria-hidden="true"
    >
      <path fill="currentColor" :d="wavePath" />
    </svg>
  </section>
</template>

<style scoped>
.wave-words {
  font-size: clamp(3.75rem, 15cqw, 15rem);
}
.hop {
  transition: transform 0.35s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.hop:hover {
  transform: translateY(-0.1em) rotate(-6deg);
}
@media (prefers-reduced-motion: reduce) {
  .hop:hover {
    transform: none;
  }
}
</style>
