<script setup lang="ts">
/**
 * A small rounded picture grows until it fills the screen as the visitor scrolls, then its title fades in.
 * The section is two and a half screens tall while its inner panel sticks to the screen; the picture is cut
 * with a clip-path, so it grows without the page reflowing. In the editor and for visitors who turn off
 * motion it is simply the full picture with its title.
 */
import EditableText from '../../site/EditableText.vue';

const props = defineProps<{
  p: { eyebrow: string; title: string; text: string; buttonLabel: string; buttonLink: string; image: string; intro: string };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const pinned = computed(() => !editing && !reduced.value);
const section = ref<HTMLElement | null>(null);

// 0 when the section's top reaches the top of the screen, 1 when its panel is about to scroll away.
const progress = useScrollProgress(section, (r, vh) => (r.height > vh ? -r.top / (r.height - vh) : 1));

/** The picture grows over the first two thirds; the title arrives over the last part. */
const grow = computed(() => (pinned.value ? between(progress.value, 0, 0.65) : 1));
const reveal = computed(() => (pinned.value ? between(progress.value, 0.6, 0.9) : 1));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

const pictureStyle = computed(() => {
  if (!pinned.value) return {};
  const g = ease(grow.value);
  // From a box 40% wide and 50% tall in the middle to the whole screen.
  const x = (1 - g) * 30;
  const y = (1 - g) * 25;
  return { clipPath: `inset(${y}% ${x}% round ${(1 - g) * 2.5}rem)` };
});
const imageStyle = computed(() => ({ transform: `scale(${1.25 - ease(grow.value) * 0.25})` }));
const contentStyle = computed(() => ({ opacity: reveal.value, transform: `translateY(${(1 - reveal.value) * 2}rem)` }));
const introStyle = computed(() => ({
  opacity: 1 - between(progress.value, 0, 0.25),
  transform: `translateY(${-grow.value * 4}rem)`,
}));
const hasButton = computed(() => Boolean(props.p.buttonLabel));
</script>

<template>
  <section ref="section" class="relative bg-surface text-ink" :class="pinned ? 'h-[250vh]' : ''">
    <p v-if="editing" class="px-6 py-10 text-center text-4xl font-black tracking-tight @3xl:text-6xl">
      <EditableText :value="p.intro" path="intro" placeholder="Text before the picture grows" />
    </p>
    <div class="relative h-[100dvh] min-h-[480px] overflow-hidden" :class="pinned ? 'sticky top-0' : ''">
      <!-- Shown above the small picture, fading as it grows -->
      <p
        v-if="pinned && p.intro"
        class="absolute inset-x-0 top-[8%] px-6 text-center text-4xl font-black tracking-tight @3xl:text-7xl"
        :style="introStyle"
        aria-hidden="true"
      >
        {{ p.intro }}
      </p>

      <div class="absolute inset-0 overflow-hidden will-change-[clip-path]" :style="pictureStyle">
        <img
          v-if="p.image"
          :src="p.image"
          :alt="p.title"
          class="h-full w-full object-cover will-change-transform"
          :style="imageStyle"
          loading="lazy"
        />
        <div v-else class="photo-placeholder h-full w-full will-change-transform" :style="imageStyle" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" :style="{ opacity: reveal }" />
      </div>

      <div
        class="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white"
        :style="contentStyle"
        :aria-hidden="pinned && reveal === 0 ? 'true' : undefined"
      >
        <p v-if="p.eyebrow || editing" class="mb-4 text-sm font-semibold uppercase tracking-[0.25em] opacity-80">
          <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
        </p>
        <h2 class="max-w-4xl text-5xl font-black leading-none tracking-tight drop-shadow-lg @3xl:text-8xl">
          <EditableText :value="p.title" path="title" placeholder="Title" />
        </h2>
        <p v-if="p.text || editing" class="mt-5 max-w-xl text-lg font-light opacity-90 @3xl:text-xl">
          <EditableText :value="p.text" path="text" multiline />
        </p>
        <a
          v-if="hasButton"
          :href="editing ? undefined : resolveHref(p.buttonLink, locale)"
          :tabindex="pinned && reveal === 0 ? -1 : undefined"
          class="glass mt-8 inline-flex items-center gap-2 rounded-[var(--radius-button)] px-7 py-3 text-sm font-semibold transition hover:scale-105"
        >
          <EditableText :value="p.buttonLabel" path="buttonLabel" />
          <i class="mdi mdi-arrow-right rtl:rotate-180" />
        </a>
      </div>
    </div>
  </section>
</template>
