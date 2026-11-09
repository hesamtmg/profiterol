<script setup lang="ts">
/**
 * The low-poly animals behind a hero (see lib/animals-scene). Three.js is fetched only by pages that use it. The
 * animals walk in once the page loader (if any) has gone, so visitors see them arrive; in the editor and for
 * visitors who asked for less motion they simply stand in place.
 */
import type { AnimalKind } from '../../../lib/lowpoly-animals';

const props = defineProps<{ kinds: AnimalKind[]; still: boolean }>();

const box = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const ready = ref(false);
let dispose = () => {};

onMounted(async () => {
  let scene: ReturnType<typeof import('../../../lib/animals-scene').animalsScene>;
  try {
    const [THREE, { Reflector }, { animalsScene }] = await Promise.all([
      import('three'),
      import('three/examples/jsm/objects/Reflector.js'),
      import('../../../lib/animals-scene'),
    ]);
    if (!canvas.value || !box.value) return;
    scene = animalsScene(THREE, Reflector, canvas.value, { kinds: props.kinds, still: props.still });
  } catch {
    return; // No WebGL: the hero shows without its animals.
  }
  const el = box.value;
  const sized = new ResizeObserver(() => {
    const r = el.getBoundingClientRect();
    scene.resize(r.width, r.height);
  });
  sized.observe(el);
  ready.value = true;

  // Walk in once the page loader is out of the way (or after a few seconds whatever happens).
  const started = performance.now();
  const waitForLoader = setInterval(() => {
    if (!document.querySelector('.site-loader') || performance.now() - started > 10000) {
      clearInterval(waitForLoader);
      scene.enter();
    }
  }, 150);

  // The clock only runs while the hero is on screen and allowed to move.
  let visible = true;
  let frame = 0;
  let last = 0;
  const tick = (now: number) => {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    scene.frame(dt);
    start();
  };
  const start = () => {
    if (!frame && visible && !props.still) frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  };
  const seen = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    if (visible) start();
    else stop();
  });
  seen.observe(el);
  const stopWatching = watch(
    () => props.still,
    (still) => {
      scene.still(still);
      if (still) stop();
      else start();
    },
  );

  const move = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    scene.point(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const leave = () => scene.point(null);
  window.addEventListener('pointermove', move, { passive: true });
  document.documentElement.addEventListener('pointerleave', leave);
  start();

  dispose = () => {
    stop();
    clearInterval(waitForLoader);
    stopWatching();
    seen.disconnect();
    sized.disconnect();
    window.removeEventListener('pointermove', move);
    document.documentElement.removeEventListener('pointerleave', leave);
    scene.dispose();
  };
});

onBeforeUnmount(() => dispose());
</script>

<template>
  <div ref="box" class="animals-scene transition-opacity duration-1000" :class="ready ? 'opacity-100' : 'opacity-0'" aria-hidden="true">
    <canvas ref="canvas" class="block h-full w-full" />
  </div>
</template>

<style scoped>
/* Fade the top edge into the hero, so the horizon has no hard line. */
.animals-scene {
  mask-image: linear-gradient(to bottom, transparent, black 18%);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 18%);
}
</style>
