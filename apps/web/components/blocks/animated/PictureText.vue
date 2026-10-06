<script setup lang="ts">
/**
 * One huge word whose letters are cut out of a photo; as the visitor scrolls past, the photo glides sideways
 * and zooms in inside them. The letters are sized from the word's length so it fills the width. In the editor
 * and for visitors who turn off motion the photo holds still.
 */
import EditableText from '../../site/EditableText.vue';

const props = defineProps<{ p: { eyebrow: string; word: string; image: string; text: string; look: string }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const moving = computed(() => !editing && !reduced.value);
const root = ref<HTMLElement | null>(null);

/** 0 as the block enters at the bottom of the screen, 1 as it leaves at the top. */
const progress = useScrollProgress(root, (r, vh) => (vh - r.top) / (vh + r.height), 0.5);

const fontSize = computed(() => {
  const letters = Math.max([...String(props.p.word ?? '')].length, 3);
  return `min(18rem, ${(100 / (letters * 0.62)).toFixed(2)}cqw)`;
});
const wordStyle = computed(() => {
  const t = moving.value ? progress.value : 0.5;
  return {
    fontSize: fontSize.value,
    backgroundImage: props.p.image ? `url("${props.p.image.replace(/"/g, '%22')}")` : undefined,
    backgroundSize: `${110 + t * 50}% auto`,
    backgroundPosition: `${t * 100}% 50%`,
  };
});
</script>

<template>
  <section
    ref="root"
    class="overflow-hidden px-4 py-20 text-center @3xl:py-28"
    :class="p.look === 'dark' ? 'bg-dark text-white' : 'bg-surface text-ink'"
  >
    <p v-if="p.eyebrow || editing" class="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
      <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
    </p>
    <h2
      class="picture-word mx-auto break-words font-black uppercase leading-[0.85] tracking-tight"
      :class="p.image ? '' : 'photo-placeholder'"
      :style="wordStyle"
    >
      <EditableText :value="p.word" path="word" placeholder="Big word" />
    </h2>
    <p v-if="p.text || editing" class="mx-auto mt-8 max-w-xl text-lg font-light opacity-75">
      <EditableText :value="p.text" path="text" multiline />
    </p>
  </section>
</template>

<style scoped>
.picture-word {
  -webkit-background-clip: text;
  background-clip: text;
  background-repeat: no-repeat;
  color: transparent;
  caret-color: var(--c-primary);
  /* Keeps the cut-out readable where the photo is close to the background color. */
  filter: drop-shadow(0 1px 0 rgb(0 0 0 / 0.08));
}
</style>
