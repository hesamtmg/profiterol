<script setup lang="ts">
/**
 * Rows of huge words that slide in opposite directions as the visitor scrolls: the page's scrolling moves them,
 * not a clock, so they stop when the visitor stops. Holds still in the editor and for visitors who turn off motion.
 */
import { getLocale } from '@profiterol/blocks';
import EditableText from '../../site/EditableText.vue';

interface Row {
  text: string;
  style: string;
}

const props = defineProps<{ p: { rows: Row[]; speed: string; look: string }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const moving = computed(() => !editing && !reduced.value);
const rtl = computed(() => getLocale(props.locale)?.dir === 'rtl');
const root = ref<HTMLElement | null>(null);
const COPIES = 8;
/** How far, in screen widths, a row travels while the block crosses the screen. */
const SPEED: Record<string, number> = { slow: 0.25, medium: 0.45, fast: 0.7 };

/** 0 as the block enters at the bottom of the screen, 1 as it leaves at the top. */
const progress = useScrollProgress(root, (r, vh) => (vh - r.top) / (vh + r.height), 0.5);

function rowStyle(i: number) {
  if (!moving.value) return {};
  const direction = (i % 2 ? 1 : -1) * (rtl.value ? -1 : 1);
  const shift = (progress.value - 0.5) * (SPEED[props.p.speed] ?? SPEED.medium) * 100 * direction;
  // Rows start a quarter of the way in, so there are words on both sides whichever way they move.
  return { transform: `translateX(calc(${rtl.value ? 25 : -25}% + ${shift}vw))` };
}

const STYLE: Record<string, string> = {
  solid: '',
  outline: 'marquee-outline',
  accent: 'text-primary',
};
</script>

<template>
  <section
    ref="root"
    class="overflow-hidden py-16 @3xl:py-24"
    :class="p.look === 'dark' ? 'bg-dark text-white' : 'bg-surface text-ink'"
    :style="
      p.look === 'dark'
        ? { '--stroke': '#fff', '--hollow': 'var(--c-dark)' }
        : { '--stroke': 'var(--c-text)', '--hollow': 'var(--c-surface)' }
    "
  >
    <div class="space-y-2 @3xl:space-y-4">
      <div
        v-for="(row, i) in p.rows"
        :key="i"
        class="flex w-max whitespace-nowrap text-6xl font-black uppercase leading-none tracking-tight will-change-transform @3xl:text-9xl"
        :class="STYLE[row.style] ?? ''"
        :style="rowStyle(i)"
      >
        <span class="pe-[0.4em]"><EditableText :value="row.text" :path="`rows.${i}.text`" placeholder="Words" /></span>
        <span v-for="n in COPIES - 1" :key="n" class="pe-[0.4em]" aria-hidden="true">{{ row.text }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
/*
 * Hollow letters: a thick stroke painted under a fill in the background color, which hides the inner half of the
 * stroke and the overlapping outlines that variable fonts have inside their letters.
 */
.marquee-outline {
  -webkit-text-stroke: 4px var(--stroke);
  paint-order: stroke fill;
  color: var(--hollow);
}
</style>
