<script setup lang="ts">
/**
 * Big italic words between two hairlines, with small diamonds in the main color between them, sliding across the
 * page on their own; scrolling the page pushes them along faster for a moment. Holds still in the editor and for
 * visitors who turn off motion.
 */
import { getLocale } from '@profiterol/blocks';
import EditableText from '../../site/EditableText.vue';
import { folioColors } from './look';

const props = defineProps<{ p: { words: { text: string }[]; speed: string; look: string }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const moving = computed(() => !editing && !reduced.value);
const rtl = computed(() => getLocale(props.locale)?.dir === 'rtl');
const colors = computed(() => folioColors(props.p.look));

/** Pixels per second when nobody scrolls. */
const SPEED: Record<string, number> = { slow: 40, normal: 70, fast: 120 };
const COPIES = 4;

const track = ref<HTMLElement | null>(null);
const offset = ref(0);
let boost = 0;
let lastY = -1;
let frame = 0;
let last = 0;

function step(now: number) {
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  // The track holds the words COPIES times over, so wrapping by the width of one set is seamless.
  const set = (track.value?.scrollWidth ?? 0) / COPIES;
  offset.value += ((SPEED[props.p.speed] ?? SPEED.normal) + boost) * dt;
  if (set > 0) offset.value %= set;
  boost *= 0.92;
  frame = requestAnimationFrame(step);
}

useScrollFrame(() => {
  const y = window.scrollY;
  if (lastY >= 0) boost = Math.min(900, boost + Math.abs(y - lastY) * 6);
  lastY = y;
});

function run(on: boolean) {
  cancelAnimationFrame(frame);
  last = 0;
  if (on) frame = requestAnimationFrame(step);
}
onMounted(() => {
  run(moving.value);
  watch(moving, run);
});
onBeforeUnmount(() => cancelAnimationFrame(frame));

const style = computed(() => (moving.value ? { transform: `translateX(${rtl.value ? offset.value : -offset.value}px)` } : {}));
</script>

<template>
  <section class="overflow-hidden border-y py-6 @3xl:py-8" :class="[colors.panel, colors.line]">
    <div ref="track" class="flex w-max whitespace-nowrap will-change-transform" :style="style">
      <template v-for="copy in COPIES" :key="copy">
        <span
          v-for="(word, i) in p.words"
          :key="`${copy}-${i}`"
          class="flex items-center text-5xl font-light italic leading-none tracking-tight @3xl:text-[5.5rem] rtl:leading-snug rtl:tracking-normal"
          :aria-hidden="copy > 1 || undefined"
        >
          <span class="px-[0.4em]">
            <EditableText v-if="copy === 1" :value="word.text" :path="`words.${i}.text`" placeholder="Word" />
            <template v-else>{{ word.text }}</template>
          </span>
          <span class="h-[0.16em] w-[0.16em] rotate-45 bg-primary" aria-hidden="true" />
        </span>
      </template>
    </div>
  </section>
</template>
