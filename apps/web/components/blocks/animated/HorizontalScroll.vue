<script setup lang="ts">
/**
 * The page pauses while a row of cards slides sideways as the visitor scrolls down, with a progress bar.
 * The section is made as tall as the row is wide; its inner panel sticks to the screen meanwhile.
 * On phones, in the editor and for visitors who turn off motion it is a plain swipeable row instead.
 */
import { getLocale } from '@profiterol/blocks';
import EditableText from '../../site/EditableText.vue';

interface Card {
  image: string;
  tag: string;
  title: string;
  text: string;
  link: string;
}

const props = defineProps<{ p: { title: string; text: string; cards: Card[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const rtl = computed(() => getLocale(props.locale)?.dir === 'rtl');

const section = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const track = ref<HTMLElement | null>(null);
const width = ref(0);
/** How far the row reaches past the screen: the distance it slides. */
const overflow = ref(0);
let resize: ResizeObserver | undefined;

const pinned = computed(() => !editing && !reduced.value && width.value >= 768 && overflow.value > 0);

const progress = useScrollProgress(section, (r) => {
  const travel = r.height - (panel.value?.offsetHeight ?? 0);
  return travel > 0 ? -r.top / travel : 0;
});

function measure() {
  width.value = section.value?.clientWidth ?? 0;
  overflow.value = Math.max(0, (track.value?.scrollWidth ?? 0) - (panel.value?.clientWidth ?? 0));
}

onMounted(() => {
  resize = new ResizeObserver(measure);
  if (section.value) resize.observe(section.value);
  if (track.value) resize.observe(track.value);
  measure();
});
onBeforeUnmount(() => resize?.disconnect());
watch(
  () => props.p.cards?.length,
  () => nextTick(measure),
);
</script>

<template>
  <section ref="section" class="relative bg-dark text-white" :style="pinned ? { height: `calc(100dvh + ${overflow}px)` } : undefined">
    <div ref="panel" class="flex flex-col justify-center overflow-hidden py-16" :class="pinned ? 'sticky top-0 h-[100dvh]' : ''">
      <div
        ref="track"
        class="flex items-stretch gap-6 px-6 @3xl:gap-8 @3xl:px-16"
        :class="pinned ? 'w-max will-change-transform' : 'snap-x snap-mandatory overflow-x-auto pb-4'"
        :style="pinned ? { transform: `translateX(${(rtl ? 1 : -1) * progress * overflow}px)` } : undefined"
      >
        <!-- Intro -->
        <div class="flex w-[78vw] max-w-sm shrink-0 snap-start flex-col justify-center @3xl:w-[30vw]">
          <h2 class="text-4xl font-black leading-tight @3xl:text-6xl">
            <EditableText :value="p.title" path="title" placeholder="Title" />
          </h2>
          <p v-if="p.text || editing" class="mt-4 text-lg font-extralight opacity-70">
            <EditableText :value="p.text" path="text" multiline />
          </p>
          <p class="mt-8 flex items-center gap-2 text-sm opacity-60" aria-hidden="true">
            <i class="mdi mdi-arrow-down motion-safe-only animate-bounce" /> <i class="mdi mdi-arrow-right rtl:rotate-180" />
          </p>
        </div>

        <component
          :is="card.link && !editing ? 'a' : 'article'"
          v-for="(card, i) in p.cards"
          :key="i"
          :href="card.link && !editing ? resolveHref(card.link, locale) : undefined"
          class="group relative aspect-[4/5] w-[78vw] max-w-md shrink-0 snap-start overflow-hidden rounded-[2rem] bg-white/5 @3xl:w-[34vw]"
        >
          <img
            v-if="card.image"
            :src="card.image"
            :alt="card.title"
            loading="lazy"
            class="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
          />
          <div v-else class="photo-placeholder absolute inset-0 transition duration-700 group-hover:scale-110" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <span class="absolute left-5 top-5 font-mono text-sm opacity-70 rtl:left-auto rtl:right-5" aria-hidden="true">{{
            String(i + 1).padStart(2, '0')
          }}</span>
          <div class="absolute inset-x-0 bottom-0 p-6 transition duration-500 group-hover:-translate-y-2">
            <span v-if="card.tag || editing" class="glass mb-3 inline-block rounded-full px-3 py-1 text-xs font-medium">
              <EditableText :value="card.tag" :path="`cards.${i}.tag`" placeholder="Tag" />
            </span>
            <h3 class="text-2xl font-bold @3xl:text-3xl"><EditableText :value="card.title" :path="`cards.${i}.title`" /></h3>
            <p v-if="card.text || editing" class="mt-2 text-sm font-light opacity-80">
              <EditableText :value="card.text" :path="`cards.${i}.text`" multiline />
            </p>
          </div>
        </component>
      </div>

      <!-- Progress -->
      <div v-if="pinned" class="mx-6 mt-10 h-0.5 overflow-hidden rounded-full bg-white/15 @3xl:mx-16" aria-hidden="true">
        <div class="h-full origin-left bg-primary rtl:origin-right" :style="{ transform: `scaleX(${progress})` }" />
      </div>
    </div>
  </section>
</template>
