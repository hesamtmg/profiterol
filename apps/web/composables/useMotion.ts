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
 * A number (usually 0–1) recomputed from the element's position whenever anything scrolls or resizes,
 * at most once per frame. Scroll events are caught in the capture phase, so this also works inside the
 * editor canvas, which scrolls in its own box rather than the window.
 */
export function useScrollProgress(target: Ref<HTMLElement | null>, compute: (rect: DOMRect, viewportHeight: number) => number, initial = 0) {
  const value = ref(initial);
  let frame = 0;

  function update() {
    frame = 0;
    if (!target.value) return;
    const next = compute(target.value.getBoundingClientRect(), window.innerHeight);
    value.value = Math.min(1, Math.max(0, next));
  }
  function schedule() {
    frame ||= requestAnimationFrame(update);
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
  return value;
}
