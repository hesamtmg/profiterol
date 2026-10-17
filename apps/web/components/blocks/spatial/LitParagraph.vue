<script setup lang="ts">
/**
 * One big paragraph whose first line is pushed in, lighting up word by word as it scrolls up the screen and ending
 * with a link in the main color ("Learn more about us."). In the editor and for visitors who turn off motion every
 * word is lit.
 */
import EditableText from '../../site/EditableText.vue';

const props = defineProps<{
  p: { text: string; linkLabel: string; linkAfter: string; link: string; look: string };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const root = ref<HTMLElement | null>(null);
const progress = useScrollProgress(root, (rect, vh) => (vh * 0.85 - rect.top) / (rect.height + vh * 0.25), 0);

const words = computed(() => props.p.text.split(/\s+/).filter(Boolean));
const lit = (i: number) => editing || reduced.value || progress.value >= (i + 1) / (words.value.length + 1);
const href = computed(() => (props.p.link && !editing ? resolveHref(props.p.link, props.locale) : undefined));
</script>

<template>
  <section class="px-5 py-28 @3xl:px-24 @3xl:py-48" :class="p.look === 'light' ? 'bg-surface text-ink' : 'bg-dark text-white'">
    <p ref="root" class="indent-[18%] text-[clamp(1.6rem,3.6cqw,3.4rem)] font-medium leading-[1.15] tracking-tight">
      <EditableText v-if="editing" :value="p.text" path="text" multiline placeholder="Text" />
      <template v-else>
        <span v-for="(word, i) in words" :key="i" class="transition-opacity duration-300" :style="{ opacity: lit(i) ? 1 : 0.22 }"
          >{{ word }}{{ ' ' }}</span
        >
      </template>
      <br v-if="p.linkLabel || p.linkAfter || editing" />
      <component
        :is="href ? 'a' : 'span'"
        :href="href"
        class="text-primary underline decoration-2 underline-offset-[0.18em] transition-opacity hover:opacity-80"
        :style="{ opacity: lit(words.length) ? 1 : 0.22 }"
      >
        <EditableText :value="p.linkLabel" path="linkLabel" placeholder="Link" />
      </component>
      {{ ' ' }}
      <span :style="{ opacity: lit(words.length) ? 1 : 0.22 }" class="transition-opacity duration-300">
        <EditableText :value="p.linkAfter" path="linkAfter" placeholder="Words" />
      </span>
    </p>
  </section>
</template>
