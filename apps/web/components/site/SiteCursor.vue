<script setup lang="ts">
/**
 * The theme's mouse pointer effect:
 * - ring:  a dot on the pointer and a ring trailing behind it that grows over links and buttons;
 * - glow:  a soft light in the main color following the pointer;
 * - blend: a circle that inverts the colors under it and grows over links.
 * Only for a mouse or trackpad, and never for visitors who turn off motion. The system pointer stays
 * visible over text fields. In the editor `target` limits it to the canvas.
 */
import type { ThemeCursor } from '@profiterol/blocks';

const props = defineProps<{ mode: ThemeCursor; target?: HTMLElement | null }>();

const enabled = ref(false);
const visible = ref(false);
const hovering = ref(false);
const pressed = ref(false);
const dot = ref<HTMLElement | null>(null);
const follower = ref<HTMLElement | null>(null);
const pos = { x: -100, y: -100 };
const trail = { x: -100, y: -100 };
let frame = 0;

const INTERACTIVE = 'a, button, [role="button"], [role="tab"], label, select, summary, input[type="range"], .flip';
const TEXT_INPUT =
  'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"], [contenteditable="plaintext-only"]';

const scope = () => props.target ?? document.documentElement;

function onMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return;
  pos.x = e.clientX;
  pos.y = e.clientY;
  const el = e.target as Element | null;
  const overText = Boolean(el?.closest?.(TEXT_INPUT));
  visible.value = !overText;
  hovering.value = Boolean(el?.closest?.(INTERACTIVE));
  frame ||= requestAnimationFrame(tick);
}

/** The dot sits on the pointer; the follower eases toward it, which gives the trailing feel. */
function tick() {
  const k = props.mode === 'glow' ? 0.12 : 0.2;
  trail.x += (pos.x - trail.x) * k;
  trail.y += (pos.y - trail.y) * k;
  if (dot.value) dot.value.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  if (follower.value) follower.value.style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0)`;
  frame = Math.abs(pos.x - trail.x) + Math.abs(pos.y - trail.y) > 0.3 ? requestAnimationFrame(tick) : 0;
}

const hide = () => (visible.value = false);
const down = () => (pressed.value = true);
const up = () => (pressed.value = false);

function attach() {
  const el = scope();
  el.addEventListener('pointermove', onMove, { passive: true });
  el.addEventListener('pointerleave', hide);
  el.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);
  // Hide the system pointer where ours replaces it (not for the glow, which only adds light).
  if (props.mode === 'ring' || props.mode === 'blend') el.classList.add('cursor-replaced');
}

function detach() {
  const el = scope();
  el.removeEventListener('pointermove', onMove);
  el.removeEventListener('pointerleave', hide);
  el.removeEventListener('pointerdown', down);
  window.removeEventListener('pointerup', up);
  el.classList.remove('cursor-replaced');
  cancelAnimationFrame(frame);
  frame = 0;
}

function setup() {
  detach();
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  enabled.value = props.mode !== 'default' && fine && !calm;
  if (enabled.value) attach();
}

onMounted(setup);
watch(() => [props.mode, props.target], setup);
onBeforeUnmount(detach);
</script>

<template>
  <div v-if="enabled" class="pointer-events-none fixed inset-0 z-[90] overflow-hidden" aria-hidden="true">
    <template v-if="mode === 'ring'">
      <div ref="follower" class="absolute left-0 top-0 transition-opacity duration-300" :class="visible ? 'opacity-100' : 'opacity-0'">
        <div
          class="-ml-[18px] -mt-[18px] h-9 w-9 rounded-full border-2 border-primary transition-all duration-300 ease-out"
          :class="[hovering ? 'scale-[1.8]' : 'scale-100', pressed ? 'scale-75' : '']"
          :style="hovering ? { background: 'color-mix(in srgb, var(--c-primary) 18%, transparent)' } : undefined"
        />
      </div>
      <div
        ref="dot"
        class="absolute left-0 top-0 transition-opacity duration-200"
        :class="visible && !hovering ? 'opacity-100' : 'opacity-0'"
      >
        <div class="-ml-1 -mt-1 h-2 w-2 rounded-full bg-primary" />
      </div>
    </template>

    <div
      v-else-if="mode === 'glow'"
      ref="follower"
      class="absolute left-0 top-0 transition-opacity duration-500"
      :class="visible ? 'opacity-100' : 'opacity-0'"
    >
      <div
        class="-ml-[220px] -mt-[220px] h-[440px] w-[440px] rounded-full transition-transform duration-500"
        :class="hovering ? 'scale-125' : 'scale-100'"
        style="background: radial-gradient(circle, color-mix(in srgb, var(--c-primary) 28%, transparent), transparent 65%)"
      />
    </div>

    <div
      v-else-if="mode === 'blend'"
      ref="follower"
      class="absolute left-0 top-0 mix-blend-difference transition-opacity duration-300"
      :class="visible ? 'opacity-100' : 'opacity-0'"
    >
      <div
        class="-ml-4 -mt-4 h-8 w-8 rounded-full bg-white transition-transform duration-300 ease-out"
        :class="[hovering ? 'scale-[2.6]' : 'scale-100', pressed ? '!scale-75' : '']"
      />
    </div>
  </div>
</template>

<style>
.cursor-replaced,
.cursor-replaced * {
  cursor: none !important;
}
.cursor-replaced :is(input:not([type='range']), textarea, [contenteditable='true'], [contenteditable='plaintext-only']) {
  cursor: text !important;
}
</style>
