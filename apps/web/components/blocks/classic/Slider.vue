<script setup lang="ts">
/**
 * minicms kind 11: full-screen photos that fade into each other. The caption, button and arrows sit
 * on frosted-glass pills at the bottom. Plays by itself (pausing on hover), swipes on phones.
 */
import { getLocale } from '@profiterol/blocks';
import EditableText from '../../site/EditableText.vue';
import ResponsiveImg from '../../site/ResponsiveImg.vue';

interface Slide {
  image: string;
  mobileImage: string;
  title: string;
  buttonLabel: string;
  buttonLink: string;
}

const props = defineProps<{ p: { slides: Slide[]; autoplay: boolean; seconds: number }; locale: string }>();
const editing = Boolean(useBlockEditing());
const active = ref(0);
const paused = ref(false);
const dir = computed(() => getLocale(props.locale)?.dir ?? 'ltr');
const count = computed(() => props.p.slides?.length ?? 0);
let timer: ReturnType<typeof setInterval> | undefined;
let touchX: number | null = null;

function go(delta: number) {
  if (!count.value) return;
  active.value = (active.value + delta + count.value) % count.value;
}

function restart() {
  clearInterval(timer);
  const reduce = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!props.p.autoplay || editing || reduce || count.value < 2) return;
  timer = setInterval(() => !paused.value && go(1), Math.max(Number(props.p.seconds) || 5, 2) * 1000);
}

function step(delta: number) {
  go(delta);
  restart();
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
}

function onTouchEnd(e: TouchEvent) {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
}

watch(count, (n) => {
  if (active.value >= n) active.value = 0;
  restart();
});
watch(() => [props.p.autoplay, props.p.seconds], restart);
onMounted(restart);
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <section
    class="relative isolate h-[100dvh] min-h-[480px] w-full overflow-hidden bg-black text-white"
    dir="ltr"
    tabindex="0"
    role="region"
    aria-roledescription="carousel"
    :aria-label="p.slides?.[active]?.title || 'Slides'"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @keydown="onKey"
    @touchstart.passive="touchX = $event.touches[0].clientX"
    @touchend="onTouchEnd"
  >
    <div
      v-for="(slide, i) in p.slides"
      :key="i"
      class="absolute inset-0 transition-opacity duration-700 ease-in-out"
      :class="i === active ? 'z-10 opacity-100' : 'pointer-events-none opacity-0'"
      :aria-hidden="i !== active"
    >
      <ResponsiveImg
        v-if="slide.image || slide.mobileImage"
        :src="slide.image"
        :mobile="slide.mobileImage"
        :alt="slide.title"
        :eager="i === 0"
        img-class="h-full w-full object-cover brightness-95 contrast-110 saturate-110"
      />
      <div v-else class="photo-placeholder h-full w-full" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      <!-- Caption, button and arrows on glass -->
      <div
        v-if="i === active"
        :key="`bar-${active}`"
        class="absolute inset-x-0 bottom-20 flex items-center justify-between gap-2 px-4 @3xl:bottom-8 @3xl:px-24"
        :dir="dir"
      >
        <p class="glass slide-in flex h-[50px] items-center rounded-full px-4 text-xs font-extralight @3xl:px-10 @3xl:text-lg">
          <EditableText :value="slide.title" :path="`slides.${i}.title`" placeholder="Caption" />
        </p>
        <div class="slide-in flex items-center gap-2" style="animation-delay: 0.15s">
          <a
            v-if="slide.buttonLabel"
            :href="editing ? undefined : resolveHref(slide.buttonLink, locale)"
            class="glass flex h-[50px] items-center rounded-full px-4 text-xs font-bold transition hover:scale-105 @3xl:px-10 @3xl:text-lg"
          >
            <EditableText :value="slide.buttonLabel" :path="`slides.${i}.buttonLabel`" />
          </a>
          <template v-if="count > 1">
            <button type="button" class="glass flex h-[50px] w-[50px] items-center justify-center rounded-full transition hover:scale-105" aria-label="Previous slide" @click="step(-1)">
              <i class="mdi mdi-chevron-left text-2xl" />
            </button>
            <button type="button" class="glass flex h-[50px] w-[50px] items-center justify-center rounded-full transition hover:scale-105" aria-label="Next slide" @click="step(1)">
              <i class="mdi mdi-chevron-right text-2xl" />
            </button>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.slide-in {
  animation: slide-in 0.8s ease-out 0.2s both;
}
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .slide-in {
    animation: none;
  }
}
</style>
