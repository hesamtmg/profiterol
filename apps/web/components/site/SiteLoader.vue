<script setup lang="ts">
/**
 * minicms's page loader. Rendered by the server so it covers the page from the first paint; it then counts
 * up with the page's real loading (its images and the window load event), shows the site name and fades out.
 * - "Only on the first page of a visit": a tiny script in <head> hides it before it is painted on later pages.
 * - Without JavaScript a CSS animation removes it after 8 seconds, so the page is never stuck behind it.
 * - Visitors who turn off motion do not get it at all.
 * `preview` (Site settings) replays it in place without remembering anything.
 */
import type { LoaderSettings } from '@profiterol/blocks';

const props = defineProps<{ loader: LoaderSettings; siteName: string; locale: string; preview?: boolean }>();
const emit = defineEmits<{ done: [] }>();

const SEEN = 'profiterol-loader-seen';
const shown = ref(true);
const percent = ref(0);
const finishing = ref(false);
let frame = 0;
let failsafe: ReturnType<typeof setTimeout> | undefined;

if (!props.preview && props.loader.oncePerSession) {
  useHead({
    script: [{ key: 'loader-seen', innerHTML: `try{if(sessionStorage.getItem('${SEEN}'))document.documentElement.classList.add('loader-seen')}catch(e){}` }],
  });
}

function finish() {
  if (finishing.value) return;
  percent.value = 100;
  finishing.value = true;
  cancelAnimationFrame(frame);
  clearTimeout(failsafe);
  if (!props.preview) {
    try {
      sessionStorage.setItem(SEEN, '1');
    } catch {
      /* private mode: show it again next time, nothing else changes */
    }
  }
  // Let the name show for a moment, then fade out.
  setTimeout(() => {
    shown.value = false;
    emit('done');
  }, props.loader.style === 'bar' ? 400 : 1400);
}

onMounted(() => {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!props.preview && (calm || document.documentElement.classList.contains('loader-seen'))) {
    shown.value = false;
    return;
  }
  const started = performance.now();
  const images = Array.from(document.images).filter((img) => img.loading !== 'lazy');
  let windowLoaded = document.readyState === 'complete' && !props.preview;
  if (!windowLoaded) window.addEventListener('load', () => (windowLoaded = true), { once: true });
  if (props.preview) setTimeout(() => (windowLoaded = true), 1800);

  // The counter heads for a target based on what has loaded, never jumping, and takes at least ~1.2 s.
  const tick = (now: number) => {
    const loaded = images.length ? images.filter((i) => i.complete).length / images.length : 1;
    const target = windowLoaded ? 100 : Math.min(92, 20 + loaded * 70 + Math.min(20, (now - started) / 150));
    const minTime = Math.min(100, ((now - started) / 1200) * 100);
    percent.value = Math.min(target, minTime, percent.value + Math.max(0.4, (target - percent.value) * 0.08));
    if (percent.value >= 99.5) finish();
    else frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  failsafe = setTimeout(finish, 8000);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  clearTimeout(failsafe);
});

const shownPercent = computed(() => Math.round(percent.value));
const digits = computed(() => (props.locale === 'fa' ? new Intl.NumberFormat('fa-IR').format(shownPercent.value) : String(shownPercent.value)));
const line = computed(() => props.loader.text?.[props.locale] ?? '');
</script>

<template>
  <Transition leave-active-class="transition-opacity duration-700" leave-to-class="opacity-0">
    <div
      v-if="shown && loader.style === 'bar'"
      class="site-loader site-loader-bar pointer-events-none z-[120] h-1 bg-primary"
      :class="preview ? 'absolute inset-x-0 top-0' : 'fixed inset-x-0 top-0'"
      :style="{ transform: `scaleX(${percent / 100})` }"
      role="progressbar"
      :aria-valuenow="shownPercent"
      aria-valuemin="0"
      aria-valuemax="100"
    />
    <div
      v-else-if="shown"
      class="site-loader z-[120] flex flex-col items-center justify-center overflow-hidden bg-dark text-white"
      :class="preview ? 'absolute inset-0' : 'fixed inset-0'"
      role="progressbar"
      :aria-valuenow="shownPercent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="siteName"
    >
      <!-- Background picture, sharpening as the page loads -->
      <div
        v-if="loader.background"
        class="absolute -inset-10 bg-cover bg-center opacity-60"
        :style="{ backgroundImage: `url('${loader.background}')`, filter: `blur(${Math.max(0, 30 * (1 - percent / 100))}px)` }"
        aria-hidden="true"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" aria-hidden="true" />

      <div class="relative px-6 text-center">
        <!-- Name filling with color -->
        <div v-if="loader.style === 'name'" class="relative text-5xl font-black tracking-tight @3xl:text-8xl" dir="auto">
          <span class="text-transparent [-webkit-text-stroke:1px_rgb(255_255_255/0.35)]">{{ siteName }}</span>
          <span class="absolute inset-0 overflow-hidden whitespace-nowrap text-primary" :style="{ clipPath: `inset(0 ${100 - percent}% 0 0)` }" aria-hidden="true">{{ siteName }}</span>
        </div>

        <!-- Percentage, then the name -->
        <template v-else>
          <Transition mode="out-in" enter-active-class="transition duration-700 ease-out" enter-from-class="opacity-0 scale-90 tracking-[0.6em]" leave-active-class="transition duration-300" leave-to-class="opacity-0">
            <p v-if="!finishing" key="count" class="text-6xl font-black tabular-nums @3xl:text-8xl" dir="ltr">{{ digits }}<span class="text-primary">%</span></p>
            <p v-else key="name" class="text-5xl font-black tracking-tight @3xl:text-7xl" dir="auto">{{ siteName }}</p>
          </Transition>
          <div class="mx-auto mt-6 h-0.5 w-56 overflow-hidden rounded-full bg-white/15">
            <div class="h-full origin-left bg-primary" :style="{ transform: `scaleX(${percent / 100})` }" />
          </div>
        </template>
        <p v-if="line" class="mt-5 text-sm font-light opacity-70">{{ line }}</p>
      </div>
    </div>
  </Transition>
</template>

<style>
/* No JavaScript: get out of the way after 8 seconds. */
.site-loader {
  animation: site-loader-failsafe 0.6s ease 8s forwards;
}
@keyframes site-loader-failsafe {
  to {
    opacity: 0;
    visibility: hidden;
  }
}
.site-loader-bar {
  transform-origin: left;
  transition: transform 0.2s linear;
}
html.loader-seen .site-loader {
  display: none;
}
@media (prefers-reduced-motion: reduce) {
  .site-loader {
    display: none;
  }
}
</style>
