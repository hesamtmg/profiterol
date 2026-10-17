<script setup lang="ts">
/**
 * A small label in the main color and a big, bold condensed sentence whose words light up one after another as the
 * visitor scrolls through it. Words between *stars* are set in light italics and words between _underscores_ in
 * the main color. The editor shows the sentence as typed, marks included, so it can be edited in place.
 */
import EditableText from '../../site/EditableText.vue';
import { folioColors, folioLabel } from './look';

const props = defineProps<{ p: { label: string; text: string; look: string }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const colors = computed(() => folioColors(props.p.look));
const box = ref<HTMLElement | null>(null);

interface Word {
  text: string;
  italic: boolean;
  accent: boolean;
}

/** The sentence as words, each knowing whether it sits inside *stars* or _underscores_. */
const words = computed<Word[]>(() => {
  const out: Word[] = [];
  let italic = false;
  let accent = false;
  for (const raw of String(props.p.text ?? '')
    .split(/\s+/)
    .filter(Boolean)) {
    let text = raw;
    const opensItalic = text.startsWith('*');
    const opensAccent = text.startsWith('_');
    if (opensItalic) [italic, text] = [true, text.slice(1)];
    if (opensAccent) [accent, text] = [true, text.slice(1)];
    // Closing marks come before trailing punctuation or at the very end ("respond*", "Manchester._").
    const closesItalic = /\*[^\p{L}\p{N}]*$/u.test(text);
    const closesAccent = /_[^\p{L}\p{N}]*$/u.test(text);
    text = text.replace(/[*_](?=[^\p{L}\p{N}]*$)/gu, '');
    if (text) out.push({ text, italic, accent });
    if (closesItalic) italic = false;
    if (closesAccent) accent = false;
  }
  return out;
});

// 0 when the sentence's top reaches 85% of the screen height, 1 when its bottom passes 45%.
const progress = useScrollProgress(box, (r, vh) => (vh * 0.85 - r.top) / (r.height + vh * 0.4), 1);

function opacity(i: number) {
  if (editing || reduced.value) return 1;
  const lit = progress.value * words.value.length;
  return 0.18 + 0.82 * Math.min(1, Math.max(0, lit - i));
}
</script>

<template>
  <section class="px-5 py-24 @3xl:px-14 @3xl:py-40" :class="colors.panel">
    <div ref="box" class="max-w-6xl">
      <p v-if="p.label || editing" class="mb-8 text-primary" :class="folioLabel">
        <EditableText :value="p.label" path="label" placeholder="(Label)" />
      </p>
      <p
        class="sentence text-[clamp(2.25rem,6.2cqw,6rem)] font-bold leading-[1.02] tracking-[-0.015em] rtl:leading-[1.3] rtl:tracking-normal"
      >
        <EditableText v-if="editing" :value="p.text" path="text" multiline />
        <template v-else>
          <template v-for="(w, i) in words" :key="i">
            <span
              class="transition-opacity duration-200"
              :class="[w.italic ? 'italic-word' : '', w.accent ? 'text-primary' : '']"
              :style="{ opacity: opacity(i) }"
              >{{ w.text }}</span
            >{{ ' ' }}
          </template>
        </template>
      </p>
    </div>
  </section>
</template>

<style scoped>
.sentence {
  font-stretch: 82%;
}
.italic-word {
  font-style: italic;
  font-weight: 300;
  font-stretch: 112%;
}
</style>
