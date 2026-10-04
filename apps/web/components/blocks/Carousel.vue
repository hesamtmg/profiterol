<script setup lang="ts">
/** Full-width slides that snap into place; arrows, dots, swipe and optional autoplay. */
import EditableText from '../site/EditableText.vue';

interface Slide {
  image: string;
  title: string;
  text: string;
  buttonLabel: string;
  buttonLink: string;
}

const props = defineProps<{ p: { slides: Slide[]; autoplay: boolean; seconds: number }; locale: string }>();
const editing = Boolean(useBlockEditing());
const track = ref<HTMLElement | null>(null);
const index = ref(0);
const paused = ref(false);
const count = computed(() => props.p.slides?.length ?? 0);

function isRtl() {
  return track.value ? getComputedStyle(track.value).direction === 'rtl' : false;
}

function go(i: number) {
  const el = track.value;
  if (!el || !count.value) return;
  const next = (i + count.value) % count.value;
  // In right-to-left layouts the scroll position counts down from zero.
  el.scrollTo({ left: next * el.clientWidth * (isRtl() ? -1 : 1), behavior: 'smooth' });
  index.value = next;
}

function onScroll() {
  const el = track.value;
  if (el && el.clientWidth) index.value = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
}

let timer: ReturnType<typeof setInterval> | undefined;
function restart() {
  clearInterval(timer);
  const reduce = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!props.p.autoplay || editing || reduce || count.value < 2) return;
  timer = setInterval(() => {
    if (!paused.value) go(index.value + 1);
  }, Math.max(2, Number(props.p.seconds) || 6) * 1000);
}

onMounted(restart);
watch(() => [props.p.autoplay, props.p.seconds, count.value], restart);
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6" @mouseenter="paused = true" @mouseleave="paused = false" @focusin="paused = true" @focusout="paused = false">
    <div class="relative">
      <div
        ref="track"
        class="flex snap-x snap-mandatory overflow-x-auto rounded-[2rem] [scrollbar-width:none] @3xl:rounded-card [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
        @scroll.passive="onScroll"
      >
        <div
          v-for="(slide, i) in p.slides"
          :key="i"
          class="relative flex aspect-[4/5] w-full shrink-0 snap-start overflow-hidden text-white @2xl:aspect-[16/9] @5xl:aspect-[21/9]"
          role="group"
          aria-roledescription="slide"
          :aria-label="`${i + 1} / ${count}`"
        >
          <img v-if="slide.image" :src="slide.image" :alt="slide.title" class="absolute inset-0 h-full w-full object-cover" :loading="i ? 'lazy' : 'eager'" />
          <div
            v-else
            class="absolute inset-0 bg-gradient-to-br"
            :class="['from-primary to-secondary', 'from-secondary to-dark', 'from-dark to-primary'][i % 3]"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div class="relative mt-auto flex max-w-2xl flex-col items-start gap-3 p-8 pb-14 @3xl:p-14 @3xl:pb-16">
            <h2 class="text-3xl font-black @3xl:text-5xl"><EditableText :value="slide.title" :path="`slides.${i}.title`" /></h2>
            <p class="font-extralight opacity-90 @3xl:text-xl"><EditableText :value="slide.text" :path="`slides.${i}.text`" multiline /></p>
            <a v-if="slide.buttonLabel" :href="resolveHref(slide.buttonLink, locale)" class="btn-pill mt-2 bg-white text-dark hover:scale-105">
              <EditableText :value="slide.buttonLabel" :path="`slides.${i}.buttonLabel`" />
            </a>
          </div>
        </div>
      </div>

      <template v-if="count > 1">
        <button
          type="button"
          class="absolute start-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-dark shadow-lg transition hover:scale-110"
          aria-label="Previous slide"
          @click="go(index - 1)"
        >
          <i class="mdi mdi-chevron-left text-2xl rtl:rotate-180" />
        </button>
        <button
          type="button"
          class="absolute end-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-dark shadow-lg transition hover:scale-110"
          aria-label="Next slide"
          @click="go(index + 1)"
        >
          <i class="mdi mdi-chevron-right text-2xl rtl:rotate-180" />
        </button>
        <div class="absolute inset-x-0 bottom-4 flex justify-center gap-2">
          <button
            v-for="(_, i) in p.slides"
            :key="i"
            type="button"
            class="h-2.5 rounded-full bg-white transition-all"
            :class="i === index ? 'w-8' : 'w-2.5 opacity-50 hover:opacity-80'"
            :aria-label="`Go to slide ${i + 1}`"
            :aria-current="i === index"
            @click="go(i)"
          />
        </div>
      </template>
    </div>
  </section>
</template>
