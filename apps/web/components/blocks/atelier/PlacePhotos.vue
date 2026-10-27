<script setup lang="ts">
/**
 * The whitecotton.pt "where it all happens": a tall photo with a second one overlapping its lower corner and a small
 * dark badge on top of both, beside a two-tone title, a text and a spaced-out link. The photos drift apart a little
 * while scrolling.
 */
import EditableText from '../../site/EditableText.vue';
import AtelierHeading from './AtelierHeading.vue';

const props = defineProps<{
  p: {
    photo: string;
    photo2: string;
    badgeTitle: string;
    badgeText: string;
    eyebrow: string;
    title: string;
    titleItalic: string;
    text: string;
    buttonLabel: string;
    buttonLink: string;
    photoSide: string;
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const href = (link: string) => (link && !editing ? resolveHref(link, props.locale) : undefined);
const root = ref<HTMLElement | null>(null);
const progress = useScrollProgress(root, (rect, vh) => (vh - rect.top) / (vh + rect.height), 0.5);
const drift = computed(() => (editing || reduced.value ? 0 : (progress.value - 0.5) * 60));
</script>

<template>
  <section ref="root" class="atelier-paper overflow-hidden px-6 py-20 text-ink @3xl:px-14 @3xl:py-28">
    <div class="mx-auto grid max-w-6xl items-center gap-14 @3xl:grid-cols-2 @3xl:gap-20">
      <div class="relative mx-auto h-[26rem] w-full max-w-md @3xl:h-[32rem]" :class="p.photoSide === 'end' ? '@3xl:order-2' : ''">
        <div
          class="absolute start-0 top-0 h-[70%] w-[64%] overflow-hidden rounded-[1.25rem] shadow-xl"
          :style="{ transform: `translateY(${-drift}px)` }"
        >
          <img v-if="p.photo" :src="p.photo" alt="" class="h-full w-full object-cover" loading="lazy" />
          <div v-else class="photo-placeholder h-full w-full" />
        </div>
        <div
          class="absolute bottom-0 end-0 h-[64%] w-[52%] overflow-hidden rounded-[1.25rem] shadow-2xl ring-4 ring-[var(--c-surface)]"
          :style="{ transform: `translateY(${drift}px)` }"
        >
          <img v-if="p.photo2" :src="p.photo2" alt="" class="h-full w-full object-cover" loading="lazy" />
          <div v-else class="photo-placeholder h-full w-full" />
        </div>
        <div
          v-if="p.badgeTitle || p.badgeText || editing"
          class="absolute bottom-[12%] start-[8%] rounded-xl bg-dark px-5 py-4 text-white shadow-xl backdrop-blur"
        >
          <p class="text-2xl font-medium tracking-tight"><EditableText :value="p.badgeTitle" path="badgeTitle" placeholder="Badge" /></p>
          <p class="mt-1 whitespace-pre-line text-[0.55rem] uppercase leading-relaxed tracking-[0.25em] text-white/55">
            <EditableText :value="p.badgeText" path="badgeText" multiline placeholder="Lines" />
          </p>
        </div>
      </div>

      <div v-reveal>
        <AtelierHeading :p="p" size="xl" />
        <p v-if="p.text || editing" class="mt-6 max-w-md whitespace-pre-line text-sm leading-relaxed text-muted">
          <EditableText :value="p.text" path="text" multiline placeholder="Text" />
        </p>
        <component
          :is="href(p.buttonLink) ? 'a' : 'span'"
          v-if="p.buttonLabel || editing"
          :href="href(p.buttonLink)"
          class="mt-8 inline-flex items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.25em] hover:text-primary"
        >
          <EditableText :value="p.buttonLabel" path="buttonLabel" placeholder="Link" />
          <i class="mdi mdi-arrow-right rtl:rotate-180" />
        </component>
      </div>
    </div>
  </section>
</template>
