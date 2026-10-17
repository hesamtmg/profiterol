import type { Ref } from 'vue';

/**
 * How much (at most 1) to scale a font size so the text of every element in `lines` fits on one line in `box`.
 * Measured after mounting, once the fonts have loaded, whenever `box` changes size and whenever `watched` changes,
 * so huge type set in a wide fallback font, or a long name, never runs off the page. 1 during server rendering.
 */
export function useFitWidth(box: Ref<HTMLElement | null>, lines: () => HTMLElement[], watched: () => unknown) {
  const scale = ref(1);
  let resize: ResizeObserver | undefined;

  function measure() {
    const el = box.value;
    if (!el) return;
    const style = getComputedStyle(el);
    const room = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    let widest = 0;
    for (const line of lines()) {
      const range = document.createRange();
      range.selectNodeContents(line);
      widest = Math.max(widest, range.getBoundingClientRect().width);
    }
    // The text was measured at the current scale, so its full-size width is widest / scale; text grows back too.
    if (widest > 0 && room > 0) scale.value = Math.min(1, (room / widest) * scale.value);
  }

  onMounted(() => {
    measure();
    document.fonts?.ready.then(measure);
    // Only width changes matter: the text getting smaller changes the box's height, which must not measure again.
    let width = box.value?.clientWidth ?? 0;
    resize = new ResizeObserver(() => {
      if (box.value?.clientWidth === width) return;
      width = box.value?.clientWidth ?? 0;
      measure();
    });
    if (box.value) resize.observe(box.value);
  });
  onBeforeUnmount(() => resize?.disconnect());
  watch(watched, () => nextTick(measure));
  return scale;
}
