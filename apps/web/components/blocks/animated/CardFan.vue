<script setup lang="ts">
/**
 * A pile of cards in the middle of the screen that spreads into a fan as the visitor scrolls: the section is
 * two and a half screens tall while its inner panel sticks to the screen. Cards narrow and overlap on small
 * screens so the fan always fits. In the editor and for visitors who turn off motion they are a plain row.
 */
import { getLocale } from '@profiterol/blocks';
import EditableText from '../../site/EditableText.vue';

interface Card {
  image: string;
  title: string;
  text: string;
}

const props = defineProps<{ p: { eyebrow: string; title: string; text: string; cards: Card[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const pinned = computed(() => !editing && !reduced.value);
const rtl = computed(() => getLocale(props.locale)?.dir === 'rtl');
const section = ref<HTMLElement | null>(null);

// 0 when the section's top reaches the top of the screen, 1 when its panel is about to scroll away.
const progress = useScrollProgress(section, (r, vh) => (r.height > vh ? -r.top / (r.height - vh) : 1));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const spread = computed(() => ease(between(progress.value, 0.08, 0.75)));
const count = computed(() => Math.max(props.p.cards?.length ?? 0, 1));

const fanStyle = computed(() => ({
  '--w': 'clamp(8rem, 24cqw, 15rem)',
  // Side by side with a small gap when there is room, overlapping when there is not.
  '--step': `min(calc(var(--w) * 1.08), calc((86cqw - var(--w)) / ${Math.max(count.value - 1, 1)}))`,
}));

function cardStyle(i: number) {
  const o = i - (count.value - 1) / 2;
  const s = spread.value;
  const x = o * s * (rtl.value ? -1 : 1);
  const turn = o * (s * 5 + (1 - s) * 2.5) * (rtl.value ? -1 : 1);
  return {
    zIndex: i + 1,
    transform: `translateX(calc(var(--step) * ${x.toFixed(4)})) translateY(${(Math.abs(o) * s * 1.25).toFixed(3)}rem) rotate(${turn.toFixed(2)}deg)`,
  };
}
</script>

<template>
  <section ref="section" class="relative bg-surface text-ink" :class="pinned ? 'h-[250vh]' : ''">
    <div
      class="flex flex-col items-center overflow-hidden px-4"
      :class="pinned ? 'sticky top-0 h-[100dvh] justify-center' : 'py-20 @3xl:py-28'"
      :style="fanStyle"
    >
      <div class="mb-10 max-w-2xl text-center @3xl:mb-14">
        <p v-if="p.eyebrow || editing" class="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
          <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
        </p>
        <h2 class="text-4xl font-black leading-tight tracking-tight @3xl:text-6xl">
          <EditableText :value="p.title" path="title" placeholder="Title" />
        </h2>
        <p v-if="p.text || editing" class="mt-4 text-lg font-light text-muted">
          <EditableText :value="p.text" path="text" multiline />
        </p>
      </div>

      <div :class="pinned ? 'relative grid w-full place-items-center' : 'flex flex-wrap justify-center gap-5'">
        <article
          v-for="(card, i) in p.cards"
          :key="i"
          class="relative aspect-[3/4] w-[var(--w)] overflow-hidden rounded-[1.5rem] bg-dark text-white shadow-2xl"
          :class="pinned ? 'col-start-1 row-start-1 will-change-transform' : ''"
          :style="pinned ? cardStyle(i) : undefined"
        >
          <img v-if="card.image" :src="card.image" :alt="card.title" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div v-else class="photo-placeholder absolute inset-0" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
          <div class="absolute inset-x-0 bottom-0 p-4 @3xl:p-5">
            <h3 class="text-lg font-bold leading-tight @3xl:text-xl">
              <EditableText :value="card.title" :path="`cards.${i}.title`" placeholder="Title" />
            </h3>
            <p v-if="card.text || editing" class="mt-1 text-xs font-light opacity-80 @3xl:text-sm">
              <EditableText :value="card.text" :path="`cards.${i}.text`" />
            </p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
