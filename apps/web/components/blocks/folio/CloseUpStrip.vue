<script setup lang="ts">
/**
 * A row of large pictures running off the edge of the page, each with a numbered caption and a tag under it. It
 * scrolls sideways (drag it with the mouse, swipe it, or use a trackpad), and scrolling the page also slides it
 * along a little. The page-scroll slide is skipped in the editor and for visitors who turn off motion.
 */
import { getLocale } from '@profiterol/blocks';
import EditableText from '../../site/EditableText.vue';
import { folioColors, folioLabel } from './look';

interface Item {
  image: string;
  caption: string;
  tag: string;
  color: string;
}

const props = defineProps<{ p: { label: string; hint: string; items: Item[]; look: string }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const rtl = computed(() => getLocale(props.locale)?.dir === 'rtl');
const colors = computed(() => folioColors(props.p.look));

const root = ref<HTMLElement | null>(null);
const scroller = ref<HTMLElement | null>(null);
/** 0 as the block enters at the bottom of the screen, 1 as it leaves at the top. */
const progress = useScrollProgress(root, (r, vh) => (vh - r.top) / (vh + r.height), 0.5);
const drift = computed(() => {
  if (editing || reduced.value) return {};
  const shift = (progress.value - 0.5) * -12 * (rtl.value ? -1 : 1);
  return { transform: `translateX(${shift}vw)` };
});

// Dragging with the mouse; touch and trackpads scroll the row natively.
let drag: { x: number; left: number; moved: boolean } | null = null;
const dragging = ref(false);
function down(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || e.button !== 0 || editing || !scroller.value) return;
  drag = { x: e.clientX, left: scroller.value.scrollLeft, moved: false };
}
function move(e: PointerEvent) {
  if (!drag || !scroller.value) return;
  const dx = e.clientX - drag.x;
  if (Math.abs(dx) > 4 && !drag.moved) {
    drag.moved = true;
    dragging.value = true;
    scroller.value.setPointerCapture(e.pointerId);
  }
  if (drag.moved) scroller.value.scrollLeft = drag.left - dx;
}
function up() {
  drag = null;
  dragging.value = false;
}

function fill(color: string) {
  return /^#[0-9a-f]{3,8}$/i.test(color ?? '') ? color : 'var(--c-primary)';
}
</script>

<template>
  <section ref="root" class="overflow-hidden py-20 @3xl:py-28" :class="colors.panel">
    <div class="mb-8 flex items-center justify-between gap-4 px-5 opacity-60 @3xl:px-14" :class="folioLabel">
      <span><EditableText :value="p.label" path="label" placeholder="(Label)" /></span>
      <span><EditableText :value="p.hint" path="hint" placeholder="Hint" /></span>
    </div>

    <div class="will-change-transform" :style="drift">
      <div
        ref="scroller"
        class="no-bar flex gap-6 overflow-x-auto px-5 @3xl:gap-7 @3xl:px-14"
        :class="dragging ? 'cursor-grabbing select-none' : editing ? '' : 'cursor-grab'"
        @pointerdown="down"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="up"
        @dragstart.prevent
      >
        <figure v-for="(item, i) in p.items" :key="i" class="w-[78vw] shrink-0 @3xl:w-[29rem]">
          <div class="relative aspect-[4/5] overflow-hidden rounded-sm" :style="{ background: fill(item.color) }">
            <img
              v-if="item.image"
              :src="item.image"
              :alt="item.caption"
              class="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
              loading="lazy"
              draggable="false"
            />
            <span
              v-else
              class="absolute inset-0 flex items-center justify-center p-8 text-center font-mono text-xs uppercase tracking-[0.14em] text-white opacity-60 mix-blend-difference rtl:font-[inherit] rtl:tracking-normal"
              aria-hidden="true"
              >{{ item.caption }}</span
            >
          </div>
          <figcaption class="mt-4 flex items-center justify-between gap-4 opacity-60" :class="folioLabel">
            <span><EditableText :value="item.caption" :path="`items.${i}.caption`" placeholder="(01) Caption" /></span>
            <span><EditableText :value="item.tag" :path="`items.${i}.tag`" placeholder="Tag" /></span>
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>

<style scoped>
.no-bar {
  scrollbar-width: none;
}
.no-bar::-webkit-scrollbar {
  display: none;
}
</style>
