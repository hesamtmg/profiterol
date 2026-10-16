<script setup lang="ts">
/**
 * A gray panel that stays on screen while the visitor scrolls through it: guide lines, a circle and a square draw
 * themselves in like a designer's construction sketch, and the sentences take turns in front of them, lighting up
 * word by word. In the editor and for visitors who turn off motion the sentences are simply stacked, fully drawn.
 */
import EditableText from '../../site/EditableText.vue';

const props = defineProps<{ p: { paragraphs: { text: string }[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const animated = computed(() => !editing && !reduced.value);
const root = ref<HTMLElement | null>(null);
const progress = useScrollProgress(root, (rect, vh) => -rect.top / Math.max(1, rect.height - vh), 0);

const count = computed(() => Math.max(1, props.p.paragraphs.length));
const words = computed(() => props.p.paragraphs.map((para) => para.text.split(/\s+/).filter(Boolean)));

/** 0–1 through paragraph `i`'s share of the scroll. */
const local = (i: number) => between(progress.value * count.value, i, i + 1);
/** Each paragraph shows while it is the current one (the last one stays). */
const visible = (i: number) => {
  const at = progress.value * count.value;
  return at >= i && (at < i + 1 || i === count.value - 1);
};
/** Words light up through the first two thirds of the paragraph's share. */
const lit = (i: number, w: number) => !animated.value || local(i) * 1.5 >= (w + 1) / (words.value[i]?.length || 1);

/** How much of a line is drawn: a part of the whole scroll, 0–1. */
const drawn = (from: number, to: number) => (animated.value ? between(progress.value, from, to) : 1);
const dash = (from: number, to: number) => ({ strokeDasharray: 1, strokeDashoffset: 1 - drawn(from, to) });

const guides = [
  { d: 'M0 150 H1400', at: [0, 0.2] },
  { d: 'M0 440 H1400', at: [0.05, 0.25] },
  { d: 'M0 760 H1400', at: [0.1, 0.3] },
  { d: 'M70 0 V860', at: [0, 0.2] },
  { d: 'M430 0 V860', at: [0.05, 0.25] },
  { d: 'M670 0 V860', at: [0.1, 0.3] },
];
const handles = [
  [70, 440],
  [430, 440],
  [70, 760],
  [430, 760],
  [445, 150],
];
</script>

<template>
  <section ref="root" class="relative px-3 py-3 @3xl:px-6" :style="animated ? { height: `${count * 100 + 30}vh` } : undefined">
    <div
      class="overflow-hidden rounded-[2rem] bg-surface text-ink @3xl:rounded-card"
      :class="animated ? 'sticky top-3 h-[calc(100svh-1.5rem)]' : 'relative'"
    >
      <!-- The construction sketch -->
      <svg
        class="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--c-text)_22%,transparent)]"
        viewBox="0 0 1400 860"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        aria-hidden="true"
      >
        <path
          v-for="(g, i) in guides"
          :key="i"
          :d="g.d"
          stroke="currentColor"
          stroke-width="1"
          pathLength="1"
          :style="dash(g.at[0], g.at[1])"
        />
        <path d="M445 165 L555 160 L460 420 Z" fill="currentColor" :style="{ opacity: drawn(0.35, 0.6) * 0.35 }" />
        <circle
          cx="450"
          cy="390"
          r="225"
          stroke="currentColor"
          stroke-width="1.5"
          pathLength="1"
          :style="dash(0.1, 0.55)"
          transform="rotate(-90 450 390)"
        />
        <circle cx="450" cy="390" r="225" fill="currentColor" :style="{ opacity: drawn(0.5, 0.75) * 0.25 }" />
        <path d="M70 440 H430 V760 H70 Z" stroke="currentColor" stroke-width="1.5" pathLength="1" :style="dash(0.3, 0.7)" />
        <path d="M70 440 H430 V760 H70 Z" fill="currentColor" :style="{ opacity: drawn(0.6, 0.85) * 0.3 }" />
        <rect
          v-for="([x, y], i) in handles"
          :key="i"
          :x="x - 4"
          :y="y - 4"
          width="8"
          height="8"
          stroke="currentColor"
          fill="var(--c-surface)"
          :style="{ opacity: drawn(0.2 + i * 0.05, 0.3 + i * 0.05) }"
        />
      </svg>

      <div :class="animated ? 'relative h-full' : 'relative space-y-16 px-6 py-24 @3xl:px-16 @3xl:py-32'">
        <p
          v-for="(para, i) in p.paragraphs"
          :key="i"
          class="mx-auto max-w-5xl text-center text-[clamp(1.75rem,5cqw,4.75rem)] font-medium leading-[1.12] tracking-tight"
          :class="
            animated
              ? [
                  'absolute inset-x-6 top-1/2 -translate-y-1/2 transition-opacity duration-500 @3xl:inset-x-16',
                  visible(i) ? 'opacity-100' : 'opacity-0',
                ]
              : ''
          "
        >
          <EditableText v-if="editing" :value="para.text" :path="`paragraphs.${i}.text`" multiline />
          <template v-else>
            <span v-for="(word, w) in words[i]" :key="w" class="transition-opacity duration-300" :style="{ opacity: lit(i, w) ? 1 : 0.16 }">
              {{ word }}{{ ' ' }}
            </span>
          </template>
        </p>
      </div>
    </div>
  </section>
</template>
