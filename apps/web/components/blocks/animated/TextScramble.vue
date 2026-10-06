<script setup lang="ts">
/**
 * Big lines that take turns, each one settling out of scrambled letters from the start side to the end side.
 * The scrambling borrows the line's own letters, so it looks right in any script. The page is served with the
 * first line; screen readers get every line at once. In the editor and for visitors who turn off motion the
 * first line simply stands still.
 */
import EditableText from '../../site/EditableText.vue';

const props = defineProps<{
  p: { eyebrow: string; lines: string; text: string; buttonLabel: string; buttonLink: string; seconds: number; look: string };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const root = ref<HTMLElement | null>(null);

const lines = computed(() =>
  String(props.p.lines ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean),
);
const shown = ref(lines.value[0] ?? '');
const SYMBOLS = '#%&*+=?/<>';
/** How long one line takes to settle. */
const DECODE_MS = 900;

let index = 0;
let frame = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let observer: IntersectionObserver | undefined;

function decode(target: string) {
  const pool = [...new Set([...target.replace(/\s/g, ''), ...SYMBOLS])];
  const chars = [...target];
  // Each letter settles at its own moment, roughly from the start of the line to its end.
  const settleAt = chars.map((_, i) => (i / Math.max(chars.length, 1)) * DECODE_MS * 0.7 + Math.random() * DECODE_MS * 0.3);
  const startAt = performance.now();
  const tick = (now: number) => {
    const t = now - startAt;
    shown.value = chars.map((c, i) => (t >= settleAt[i]! || /\s/.test(c) ? c : pool[Math.floor(Math.random() * pool.length)])).join('');
    if (t < DECODE_MS) frame = requestAnimationFrame(tick);
    else timer = setTimeout(next, Math.max(Number(props.p.seconds) || 3, 1) * 1000 - DECODE_MS);
  };
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(tick);
}

function next() {
  if (!lines.value.length) return;
  index = (index + 1) % lines.value.length;
  decode(lines.value[index]!);
}

function stop() {
  cancelAnimationFrame(frame);
  clearTimeout(timer);
}

onMounted(() => {
  if (editing || !root.value) return;
  observer = new IntersectionObserver(
    ([entry]) => {
      stop();
      if (!entry!.isIntersecting || reduced.value || !lines.value.length) return;
      index = Math.min(index, lines.value.length - 1);
      decode(lines.value[index]!);
    },
    { threshold: 0.3 },
  );
  observer.observe(root.value);
});
watch(reduced, (r) => {
  if (!r) return;
  stop();
  shown.value = lines.value[0] ?? '';
});
onBeforeUnmount(() => {
  observer?.disconnect();
  stop();
});
</script>

<template>
  <section
    ref="root"
    class="relative overflow-hidden px-6 py-24 @3xl:px-16 @3xl:py-36"
    :class="p.look === 'light' ? 'bg-surface text-ink' : 'bg-dark text-white'"
  >
    <div class="mx-auto max-w-5xl text-center">
      <p v-if="p.eyebrow || editing" class="mb-6 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
        <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
      </p>
      <h2 v-if="editing" class="text-5xl font-black leading-tight tracking-tight @3xl:text-8xl">
        <EditableText :value="p.lines" path="lines" multiline placeholder="Lines" />
      </h2>
      <h2 v-else class="text-5xl font-black leading-tight tracking-tight @3xl:text-8xl">
        <span class="sr-only">{{ lines.join(' ') }}</span>
        <span class="block min-h-[1.25em] break-words" aria-hidden="true">{{ shown }}</span>
      </h2>
      <p v-if="p.text || editing" class="mx-auto mt-8 max-w-xl text-lg font-light opacity-75">
        <EditableText :value="p.text" path="text" multiline />
      </p>
      <a
        v-if="p.buttonLabel"
        :href="editing ? undefined : resolveHref(p.buttonLink, locale)"
        class="mt-10 inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
      >
        <EditableText :value="p.buttonLabel" path="buttonLabel" />
        <i class="mdi mdi-arrow-right rtl:rotate-180" />
      </a>
    </div>
  </section>
</template>
