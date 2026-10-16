<script setup lang="ts">
/**
 * minicms's page loader. Rendered by the server so it covers the page from the first paint; it then counts
 * up with the page's real loading (its images and the window load event), shows the site name and fades out.
 * - "Only on the first page of a visit": a tiny script in <head> hides it before it is painted on later pages.
 * - Without JavaScript a CSS animation removes it after 8 seconds, so the page is never stuck behind it.
 * - Visitors who turn off motion do not get it at all.
 * `preview` (Site settings) replays it in place without remembering anything.
 * Styles: a percentage counter, a thin bar, the name filling with color, the logo in a filling ring, a spinning ring,
 * bouncing dots, pulsing circles, the name typed out, and a curtain that opens on the site.
 */
import type { LoaderSettings } from '@profiterol/blocks';

const props = defineProps<{ loader: LoaderSettings; siteName: string; locale: string; logo?: string; preview?: boolean }>();
const emit = defineEmits<{ done: [] }>();

const SEEN = 'profiterol-loader-seen';
const shown = ref(true);
const percent = ref(0);
const finishing = ref(false);
let frame = 0;
let failsafe: ReturnType<typeof setTimeout> | undefined;

if (!props.preview && props.loader.oncePerSession) {
  useHead({
    script: [
      {
        key: 'loader-seen',
        innerHTML: `try{if(sessionStorage.getItem('${SEEN}'))document.documentElement.classList.add('loader-seen')}catch(e){}`,
      },
    ],
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
  setTimeout(
    () => {
      shown.value = false;
      emit('done');
    },
    props.loader.style === 'bar' ? 400 : props.loader.style === 'curtain' ? 1100 : 1400,
  );
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
const digits = computed(() =>
  props.locale === 'fa' ? new Intl.NumberFormat('fa-IR').format(shownPercent.value) : String(shownPercent.value),
);
// The color fills in reading direction: from the left, or from the right in Persian.
const fillClip = computed(() => (props.locale === 'fa' ? `inset(0 0 0 ${100 - percent.value}%)` : `inset(0 ${100 - percent.value}% 0 0)`));
const line = computed(() => props.loader.text?.[props.locale] ?? '');

/** The logo ring: its length, and how much of it is still empty. */
const RING = 2 * Math.PI * 54;
const ringOffset = computed(() => RING * (1 - percent.value / 100));
/** The typing style: as much of the name as has "loaded" (whole letters, so Persian joins correctly). */
const letters = computed(() => Array.from(props.siteName));
const typed = computed(() => letters.value.slice(0, Math.ceil((letters.value.length * percent.value) / 100)).join(''));
/** Styles drawn on a dark full-screen cover; the curtain draws its own two halves instead. */
const covered = computed(() => props.loader.style !== 'curtain');
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
      class="site-loader z-[120] flex flex-col items-center justify-center overflow-hidden text-white"
      :class="[preview ? 'absolute inset-0' : 'fixed inset-0', covered ? 'bg-dark' : '']"
      role="progressbar"
      :aria-valuenow="shownPercent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="siteName"
    >
      <!-- Curtain: two halves meeting at a progress line, sliding apart when the page is ready -->
      <template v-if="loader.style === 'curtain'">
        <div
          class="absolute inset-x-0 top-0 h-1/2 bg-dark transition-transform duration-1000 ease-in-out"
          :class="finishing ? '-translate-y-full' : ''"
          aria-hidden="true"
        />
        <div
          class="absolute inset-x-0 bottom-0 h-1/2 bg-dark transition-transform duration-1000 ease-in-out"
          :class="finishing ? 'translate-y-full' : ''"
          aria-hidden="true"
        />
        <div
          class="absolute inset-x-0 top-1/2 h-px origin-left bg-primary transition-opacity duration-300 rtl:origin-right"
          :class="finishing ? 'opacity-0' : ''"
          :style="{ transform: `scaleX(${percent / 100})` }"
          aria-hidden="true"
        />
      </template>

      <!-- Background picture, sharpening as the page loads -->
      <div
        v-if="loader.background && covered"
        class="absolute -inset-10 bg-cover bg-center opacity-60"
        :style="{ backgroundImage: `url('${loader.background}')`, filter: `blur(${Math.max(0, 30 * (1 - percent / 100))}px)` }"
        aria-hidden="true"
      />
      <div v-if="covered" class="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" aria-hidden="true" />

      <div
        class="relative px-6 text-center transition-opacity duration-300"
        :class="{ 'opacity-0': loader.style === 'curtain' && finishing }"
      >
        <!-- Name filling with color: both copies share one grid cell, so they wrap and sit exactly on top of each other -->
        <div
          v-if="loader.style === 'name'"
          class="grid text-5xl font-black leading-tight tracking-tight @3xl:text-8xl"
          :dir="locale === 'fa' ? 'rtl' : 'ltr'"
        >
          <span class="[grid-area:1/1] text-transparent [-webkit-text-stroke:1px_rgb(255_255_255/0.35)]">{{ siteName }}</span>
          <span class="[grid-area:1/1] text-primary" :style="{ clipPath: fillClip }" aria-hidden="true">{{ siteName }}</span>
        </div>

        <!-- Logo (or the name) in a ring that fills up -->
        <div v-else-if="loader.style === 'logo'" class="flex flex-col items-center">
          <div class="relative flex h-40 w-40 items-center justify-center">
            <svg class="absolute inset-0 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgb(255 255 255 / 0.15)" stroke-width="2" />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                class="stroke-primary"
                stroke-width="3"
                stroke-linecap="round"
                :stroke-dasharray="RING"
                :stroke-dashoffset="ringOffset"
              />
            </svg>
            <img
              v-if="logo"
              :src="logo"
              :alt="siteName"
              class="max-h-16 max-w-24 object-contain transition duration-500"
              :class="finishing ? 'scale-110' : ''"
            />
            <span v-else class="px-3 text-lg font-black leading-tight" dir="auto">{{ siteName }}</span>
          </div>
          <p class="mt-4 text-sm font-light tabular-nums opacity-70" dir="ltr">{{ digits }}%</p>
        </div>

        <!-- Spinning ring -->
        <div v-else-if="loader.style === 'spinner'" class="flex flex-col items-center">
          <div class="h-14 w-14 animate-spin rounded-full border-2 border-white/15 border-t-primary" aria-hidden="true" />
          <p class="mt-6 text-3xl font-black tracking-tight @3xl:text-5xl" dir="auto">{{ siteName }}</p>
        </div>

        <!-- Bouncing dots -->
        <div v-else-if="loader.style === 'dots'" class="flex flex-col items-center">
          <p class="text-3xl font-black tracking-tight @3xl:text-5xl" dir="auto">{{ siteName }}</p>
          <div class="mt-6 flex gap-2" dir="ltr" aria-hidden="true">
            <span
              v-for="i in 3"
              :key="i"
              class="h-3 w-3 animate-bounce rounded-full bg-primary"
              :style="{ animationDelay: `${(i - 1) * 150}ms` }"
            />
          </div>
        </div>

        <!-- Circles pulsing out from the logo or the name -->
        <div v-else-if="loader.style === 'pulse'" class="relative flex h-48 w-48 items-center justify-center">
          <span
            v-for="i in 3"
            :key="i"
            class="site-loader-ring absolute inset-0 rounded-full border border-primary"
            :style="{ animationDelay: `${(i - 1) * 600}ms` }"
            aria-hidden="true"
          />
          <img v-if="logo" :src="logo" :alt="siteName" class="relative max-h-16 max-w-28 object-contain" />
          <span v-else class="relative px-4 text-2xl font-black leading-tight" dir="auto">{{ siteName }}</span>
        </div>

        <!-- The name typed out as the page loads -->
        <p v-else-if="loader.style === 'typing'" class="text-4xl font-black tracking-tight @3xl:text-7xl" dir="auto">
          <span aria-hidden="true">{{ typed }}</span
          ><span class="site-loader-caret ms-1 inline-block w-[0.08em] bg-primary" aria-hidden="true">&nbsp;</span>
        </p>

        <!-- Curtain: the name over the line -->
        <p v-else-if="loader.style === 'curtain'" class="text-3xl font-black tracking-tight @3xl:text-6xl" dir="auto">{{ siteName }}</p>

        <!-- Percentage, then the name -->
        <template v-else>
          <Transition
            mode="out-in"
            enter-active-class="transition duration-700 ease-out"
            enter-from-class="opacity-0 scale-90 tracking-[0.6em]"
            leave-active-class="transition duration-300"
            leave-to-class="opacity-0"
          >
            <p v-if="!finishing" key="count" class="text-6xl font-black tabular-nums @3xl:text-8xl" dir="ltr">
              {{ digits }}<span class="text-primary">%</span>
            </p>
            <p v-else key="name" class="text-5xl font-black tracking-tight @3xl:text-7xl" dir="auto">{{ siteName }}</p>
          </Transition>
          <div class="mx-auto mt-6 h-0.5 w-56 overflow-hidden rounded-full bg-white/15">
            <div class="h-full origin-left bg-primary" :style="{ transform: `scaleX(${percent / 100})` }" />
          </div>
        </template>
        <p v-if="line" class="mt-5 text-sm font-light opacity-70" :class="{ 'mt-16': loader.style === 'curtain' }">{{ line }}</p>
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
/* Pulsing circles and the typing caret. */
.site-loader-ring {
  animation: site-loader-ring 1.8s cubic-bezier(0.2, 0.6, 0.3, 1) infinite;
  opacity: 0;
}
@keyframes site-loader-ring {
  from {
    transform: scale(0.45);
    opacity: 0.9;
  }
  to {
    transform: scale(1.25);
    opacity: 0;
  }
}
.site-loader-caret {
  animation: site-loader-caret 0.9s steps(1) infinite;
}
@keyframes site-loader-caret {
  50% {
    opacity: 0;
  }
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
