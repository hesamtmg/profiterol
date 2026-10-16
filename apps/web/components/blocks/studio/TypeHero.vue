<script setup lang="ts">
/**
 * The awakeagency.dev first screen: a panel in the main color with huge words pushed to both edges, each line
 * rising out of its own mask in turn; round badges like coins bob gently and drift with the mouse; a line at the
 * bottom with the city and its live local time. In the editor and for visitors who turn off motion it stands still.
 */
import EditableText from '../../site/EditableText.vue';

interface Line {
  start: string;
  end: string;
}
interface Badge {
  label: string;
  image: string;
  color: string;
}

const props = defineProps<{
  p: { lines: Line[]; text: string; badges: Badge[]; placeLabel: string; city: string; timeZone: string; look: string };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const still = computed(() => editing || reduced.value);
const time = useLocalClock(
  () => props.p.timeZone,
  () => props.locale,
);

const colors = computed(() =>
  props.p.look === 'dark' ? 'bg-dark text-white' : props.p.look === 'light' ? 'bg-surface text-ink' : 'bg-primary text-white',
);

/** Where the badges sit (percent of the panel), how big they are, and how far each drifts with the mouse. */
const spots = [
  { x: 6, y: 15, size: 7, depth: 26, delay: 0 },
  { x: 17, y: 7, size: 6.5, depth: -18, delay: 1.1 },
  { x: 23, y: 30, size: 6, depth: 40, delay: 2.2 },
  { x: 62, y: 10, size: 5, depth: -32, delay: 0.6 },
];

const root = ref<HTMLElement | null>(null);
const mouse = reactive({ x: 0, y: 0 });
function onMove(e: PointerEvent) {
  if (still.value || e.pointerType !== 'mouse' || !root.value) return;
  const r = root.value.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) / r.width - 0.5;
  mouse.y = (e.clientY - r.top) / r.height - 0.5;
}

function coin(color: string) {
  const c = /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#ffc2d1';
  return {
    background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${c} 55%, white), ${c} 55%, color-mix(in srgb, ${c} 78%, black))`,
    color: `color-mix(in srgb, ${c} 70%, black)`,
  };
}
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div
      ref="root"
      class="relative flex min-h-[calc(100svh-1.5rem)] flex-col overflow-hidden rounded-[2rem] px-5 pb-6 pt-24 @3xl:rounded-card @3xl:px-10 @3xl:pb-10 @3xl:pt-32"
      :class="colors"
      @pointermove="onMove"
      @pointerleave="Object.assign(mouse, { x: 0, y: 0 })"
    >
      <!-- Floating badges -->
      <div
        v-for="(badge, i) in p.badges.slice(0, spots.length)"
        :key="i"
        class="pointer-events-none absolute z-0 transition-transform duration-700 ease-out"
        :style="{
          insetInlineStart: `${spots[i].x}%`,
          top: `calc(${spots[i].y * 0.8}% + 3.5rem)`,
          width: `clamp(3.25rem, ${spots[i].size}cqw, 6.5rem)`,
          transform: `translate(${mouse.x * spots[i].depth}px, ${mouse.y * spots[i].depth}px)`,
        }"
        aria-hidden="true"
      >
        <div
          class="coin flex aspect-square w-full items-center justify-center overflow-hidden rounded-full text-[clamp(1.25rem,2.6cqw,2.5rem)] font-semibold"
          :class="still ? '' : 'coin-float'"
          :style="{ ...coin(badge.color), animationDelay: `-${spots[i].delay}s` }"
        >
          <img v-if="badge.image" :src="badge.image" alt="" class="h-full w-full object-cover" />
          <span v-else class="coin-letter">{{ badge.label }}</span>
        </div>
      </div>

      <div class="relative z-10 my-auto py-10">
        <h1 class="relative z-10 text-[clamp(2.4rem,8.4cqw,9.5rem)] font-medium uppercase leading-[0.98] tracking-tight">
          <span v-for="(line, i) in p.lines" :key="i" class="flex flex-wrap justify-between gap-x-[0.3em]">
            <span class="block overflow-hidden pb-[0.04em]">
              <span class="block" :class="editing ? '' : 'line-rise'" :style="{ animationDelay: `${i * 120}ms` }">
                <EditableText :value="line.start" :path="`lines.${i}.start`" placeholder="Words" />
              </span>
            </span>
            <span v-if="line.end || editing" class="ms-auto block overflow-hidden pb-[0.04em]">
              <span class="block" :class="editing ? '' : 'line-rise'" :style="{ animationDelay: `${i * 120 + 60}ms` }">
                <EditableText :value="line.end" :path="`lines.${i}.end`" placeholder="Words" />
              </span>
            </span>
          </span>
        </h1>

        <p
          v-if="p.text || editing"
          class="relative z-10 ms-auto mt-8 max-w-xs text-sm font-light leading-relaxed opacity-90 @3xl:-mt-[3.4cqw] @3xl:text-base"
          :class="editing ? '' : 'text-fade'"
        >
          <EditableText :value="p.text" path="text" multiline />
        </p>
      </div>

      <div
        v-if="p.city || p.placeLabel || editing"
        class="relative z-10 border-t border-[color-mix(in_srgb,currentColor_30%,transparent)] pt-8 text-sm uppercase @3xl:pt-12"
      >
        <span class="opacity-80"><EditableText :value="p.placeLabel" path="placeLabel" placeholder="Based in:" /></span>
        <span class="ms-1"><EditableText :value="p.city" path="city" placeholder="City" /></span>
        <span v-if="time" class="ms-1 tabular-nums">{{ time }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.coin {
  box-shadow:
    0 22px 30px -12px rgb(0 0 0 / 0.4),
    inset 0 -5px 10px rgb(0 0 0 / 0.18),
    inset 0 4px 8px rgb(255 255 255 / 0.55);
}
.coin-letter {
  text-shadow:
    0 1px 0 rgb(255 255 255 / 0.5),
    0 -1px 0 rgb(0 0 0 / 0.15);
}
.coin-float {
  animation: coin-float 6s ease-in-out infinite;
}
/* Pure CSS, so the words come up on the served page before any script runs. */
.line-rise {
  animation: line-rise 1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@keyframes line-rise {
  from {
    transform: translateY(110%);
  }
}
.text-fade {
  animation: text-fade 1s ease-out 0.5s both;
}
@keyframes text-fade {
  from {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .line-rise,
  .text-fade {
    animation: none;
  }
}
@keyframes coin-float {
  0%,
  100% {
    transform: translateY(0) rotate(-6deg);
  }
  50% {
    transform: translateY(-14px) rotate(8deg);
  }
}
</style>
