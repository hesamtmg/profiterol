<script setup lang="ts">
/**
 * The theme's page transition. A panel covers the page when an internal link is clicked, then the next
 * page loads and the same panel uncovers it. The uncovering is a plain CSS animation in the server-rendered
 * page, so it plays without waiting for JavaScript. Visitors who turn off motion get ordinary page loads.
 * `contained` is for the editor canvas: no link handling, and the animation replays when the choice changes.
 */
import type { ThemePageTransition } from '@profiterol/blocks';

const props = defineProps<{ mode: ThemePageTransition; label?: string; contained?: boolean }>();

const leaving = ref(false);
const replay = ref(0);
const origin = reactive({ x: '50%', y: '50%' });
const LEAVE_MS = 550;

function isInternal(a: HTMLAnchorElement) {
  if (a.target && a.target !== '_self') return false;
  if (a.hasAttribute('download') || a.dataset.noTransition !== undefined) return false;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return false;
  if (/^\/(admin|api|uploads)(\/|$)/.test(url.pathname)) return false;
  // Same page with only a #anchor: let the browser scroll.
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return false;
  return true;
}

function onClick(e: MouseEvent) {
  if (props.mode === 'none' || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!a || !isInternal(a)) return;
  e.preventDefault();
  origin.x = `${e.clientX}px`;
  origin.y = `${e.clientY}px`;
  leaving.value = true;
  setTimeout(() => location.assign(a.href), LEAVE_MS);
}

/** Coming back with the browser's Back button can show this page from memory, still covered. */
function onPageShow(e: PageTransitionEvent) {
  if (e.persisted) leaving.value = false;
}

const active = ref(false);
onMounted(() => {
  active.value = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (props.contained || !active.value) return;
  document.addEventListener('click', onClick);
  window.addEventListener('pageshow', onPageShow);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onClick);
  window.removeEventListener('pageshow', onPageShow);
});
watch(
  () => props.mode,
  () => props.contained && replay.value++,
);
</script>

<template>
  <div
    v-if="mode !== 'none'"
    :key="replay"
    class="pt pointer-events-none z-[100] overflow-hidden"
    :class="[`pt-${mode}`, contained ? 'absolute inset-x-0 top-0 h-[85vh]' : 'fixed inset-0', leaving ? 'pt-leave' : 'pt-enter']"
    :style="{ '--px': origin.x, '--py': origin.y }"
    aria-hidden="true"
  >
    <template v-if="mode === 'curtain'">
      <div class="pt-panel pt-panel-1 absolute inset-0 bg-primary" />
      <div class="pt-panel pt-panel-2 absolute inset-0 flex items-center justify-center bg-dark">
        <span v-if="label" class="text-3xl font-black text-white @3xl:text-5xl">{{ label }}</span>
      </div>
    </template>
    <div v-else class="pt-panel absolute inset-0 flex items-center justify-center" :class="mode === 'fade' ? 'bg-[var(--c-background)]' : 'bg-primary'">
      <span v-if="label && mode === 'slide'" class="text-3xl font-black text-white @3xl:text-5xl">{{ label }}</span>
    </div>
  </div>
</template>

<style>
/* Uncover (page load) */
.pt-enter.pt-fade .pt-panel {
  animation: pt-fade-out 0.6s ease-out 0.05s both;
}
.pt-enter.pt-slide .pt-panel {
  animation: pt-up-out 0.8s cubic-bezier(0.7, 0, 0.2, 1) 0.1s both;
}
.pt-enter.pt-curtain .pt-panel-2 {
  animation: pt-wipe-out 0.7s cubic-bezier(0.7, 0, 0.2, 1) 0.1s both;
}
.pt-enter.pt-curtain .pt-panel-1 {
  animation: pt-wipe-out 0.7s cubic-bezier(0.7, 0, 0.2, 1) 0.25s both;
}
.pt-enter.pt-circle .pt-panel {
  animation: pt-circle-out 0.8s cubic-bezier(0.7, 0, 0.2, 1) 0.05s both;
}

/* Cover (leaving) */
.pt-leave {
  pointer-events: auto;
}
.pt-leave.pt-fade .pt-panel {
  animation: pt-fade-out 0.4s ease-in reverse both;
}
.pt-leave.pt-slide .pt-panel {
  animation: pt-up-in 0.55s cubic-bezier(0.7, 0, 0.2, 1) both;
}
.pt-leave.pt-curtain .pt-panel-1 {
  animation: pt-wipe-in 0.45s cubic-bezier(0.7, 0, 0.2, 1) both;
}
.pt-leave.pt-curtain .pt-panel-2 {
  animation: pt-wipe-in 0.45s cubic-bezier(0.7, 0, 0.2, 1) 0.1s both;
}
.pt-leave.pt-circle .pt-panel {
  animation: pt-circle-in 0.55s cubic-bezier(0.7, 0, 0.2, 1) both;
}

@keyframes pt-fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@keyframes pt-up-out {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-101%);
  }
}
@keyframes pt-up-in {
  from {
    transform: translateY(101%);
  }
  to {
    transform: translateY(0);
  }
}
@keyframes pt-wipe-out {
  from {
    transform: scaleX(1);
    transform-origin: right;
  }
  to {
    transform: scaleX(0);
    transform-origin: right;
  }
}
@keyframes pt-wipe-in {
  from {
    transform: scaleX(0);
    transform-origin: left;
  }
  to {
    transform: scaleX(1);
    transform-origin: left;
  }
}
@keyframes pt-circle-out {
  from {
    clip-path: circle(150% at 50% 50%);
  }
  to {
    clip-path: circle(0% at 50% 50%);
  }
}
@keyframes pt-circle-in {
  from {
    clip-path: circle(0% at var(--px) var(--py));
  }
  to {
    clip-path: circle(150% at var(--px) var(--py));
  }
}
@media (prefers-reduced-motion: reduce) {
  .pt {
    display: none;
  }
}
</style>
