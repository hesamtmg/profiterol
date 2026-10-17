<script setup lang="ts">
/**
 * The undplus.com first screen: one huge word in the main color fills the screen and glides sideways forever (a
 * little faster while scrolling), and at the bottom a line of text whose last words type themselves, wait, erase and
 * make room for the next ones. In the editor and for visitors who turn off motion the word stands still and the first
 * words are shown whole.
 */
import EditableText from '../../site/EditableText.vue';

const props = defineProps<{
  p: { word: string; lead: string; words: { text: string }[]; seconds: number; look: string };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const still = computed(() => editing || reduced.value);

const colors = computed(() =>
  props.p.look === 'light'
    ? { panel: 'bg-surface text-ink', word: 'text-primary' }
    : props.p.look === 'accent'
      ? { panel: 'bg-primary text-dark', word: 'text-dark' }
      : { panel: 'bg-dark text-white', word: 'text-primary' },
);
const duration = computed(() => `${Math.max(Number(props.p.seconds) || 18, 4)}s`);

const root = ref<HTMLElement | null>(null);
// Scrolling away pushes the word further along, on top of its own glide.
const scrolled = useScrollProgress(root, (rect) => -rect.top / Math.max(1, rect.height), 0);

const choices = computed(() => props.p.words.map((w) => w.text).filter(Boolean));
const typed = ref('');
let timer: ReturnType<typeof setTimeout> | undefined;

/** Types choice `i` letter by letter, holds it, erases it and moves on. */
function type(i: number, length: number, erasing: boolean) {
  const words = choices.value;
  if (!words.length) return;
  const word = Array.from(words[i % words.length]);
  typed.value = word.slice(0, length).join('');
  if (!erasing && length < word.length) timer = setTimeout(() => type(i, length + 1, false), 65);
  else if (!erasing) timer = setTimeout(() => type(i, length, true), 1900);
  else if (length > 0) timer = setTimeout(() => type(i, length - 1, true), 28);
  else timer = setTimeout(() => type(i + 1, 0, false), 250);
}

onMounted(() => {
  watch(
    [still, choices],
    () => {
      clearTimeout(timer);
      if (still.value) typed.value = choices.value[0] ?? '';
      else type(0, 0, false);
    },
    { immediate: true },
  );
});
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <section ref="root" class="relative flex min-h-[100svh] flex-col overflow-hidden" :class="colors.panel">
    <!-- The giant word, twice in a row so the glide never shows a gap -->
    <div class="pointer-events-none absolute inset-x-0 top-[18%] select-none @3xl:top-[20%]" dir="ltr" aria-hidden="true">
      <div :style="still ? undefined : { transform: `translateX(${-scrolled * 25}%)` }">
        <div
          class="letter-glide flex w-max"
          :class="still ? '' : 'motion-safe-only'"
          :style="still ? undefined : { animation: `slide-x ${duration} linear infinite` }"
        >
          <span
            v-for="copy in 2"
            :key="copy"
            class="whitespace-nowrap pe-[0.25em] font-black uppercase leading-[0.8] tracking-[-0.02em]"
            :class="colors.word"
          >
            {{ p.word }}
          </span>
        </div>
      </div>
    </div>

    <h1 class="sr-only">{{ p.word }}</h1>

    <div class="relative z-10 mt-auto px-5 pb-16 @3xl:px-10 @3xl:pb-24">
      <p
        class="ms-auto max-w-[min(100%,52rem)] text-[clamp(1.9rem,4.4cqw,4.5rem)] font-semibold leading-[1.08] tracking-tight @3xl:w-[58%]"
        :class="editing ? '' : 'lead-rise'"
      >
        <EditableText :value="p.lead" path="lead" placeholder="Studio for" />
        {{ ' ' }}
        <span v-if="editing" class="opacity-80"><EditableText :value="p.words[0]?.text" path="words.0.text" placeholder="Words" /></span>
        <span v-else class="whitespace-pre-wrap opacity-90" aria-live="off">{{ typed }}<span class="caret" aria-hidden="true" /></span>
      </p>
    </div>
  </section>
</template>

<style scoped>
.letter-glide span {
  font-size: clamp(9rem, 40cqw, 46rem);
}
.caret {
  display: inline-block;
  width: 0.06em;
  height: 0.9em;
  margin-inline-start: 0.04em;
  vertical-align: -0.08em;
  background: currentColor;
  animation: caret 1s steps(1) infinite;
}
@keyframes caret {
  50% {
    opacity: 0;
  }
}
.lead-rise {
  animation: lead-rise 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s both;
}
@keyframes lead-rise {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .lead-rise,
  .caret {
    animation: none;
  }
}
</style>
