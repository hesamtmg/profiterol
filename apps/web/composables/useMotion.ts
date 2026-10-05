import type { Ref } from 'vue';

/** True when the visitor asked their system for less motion. Always false during server rendering. */
export function useReducedMotion() {
  const reduced = ref(false);
  onMounted(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.value = query.matches;
    const update = () => (reduced.value = query.matches);
    query.addEventListener('change', update);
    onBeforeUnmount(() => query.removeEventListener('change', update));
  });
  return reduced;
}

/**
 * Calls `update` once on mount, then at most once per frame whenever anything scrolls or resizes.
 * Scroll events are caught in the capture phase, so this also works inside the editor canvas,
 * which scrolls in its own box rather than the window.
 */
export function useScrollFrame(update: () => void) {
  let frame = 0;
  function run() {
    frame = 0;
    update();
  }
  function schedule() {
    frame ||= requestAnimationFrame(run);
  }

  onMounted(() => {
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    update();
  });
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', schedule, { capture: true });
    window.removeEventListener('resize', schedule);
    cancelAnimationFrame(frame);
  });
  return schedule;
}

/** A number (usually 0–1) recomputed from the element's position whenever anything scrolls or resizes. */
export function useScrollProgress(
  target: Ref<HTMLElement | null>,
  compute: (rect: DOMRect, viewportHeight: number) => number,
  initial = 0,
) {
  const value = ref(initial);
  useScrollFrame(() => {
    if (!target.value) return;
    const next = compute(target.value.getBoundingClientRect(), window.innerHeight);
    value.value = Math.min(1, Math.max(0, next));
  });
  return value;
}

/** Where `value` sits between `from` and `to`, as 0–1. */
export const between = (value: number, from: number, to: number) => Math.min(1, Math.max(0, (value - from) / (to - from)));
