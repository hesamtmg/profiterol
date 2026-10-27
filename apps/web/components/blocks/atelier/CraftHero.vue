<script setup lang="ts">
/**
 * The whitecotton.pt first screen: a photo (or a muted looping video) of the place, darkened from the bottom, with a
 * small label, a two-tone headline rising in, a short text and two quiet buttons. The header floats over it.
 */
import EditableText from '../../site/EditableText.vue';
import AtelierHeading from './AtelierHeading.vue';

const props = defineProps<{
  p: {
    eyebrow: string;
    title: string;
    titleItalic: string;
    text: string;
    buttonLabel: string;
    buttonLink: string;
    secondButtonLabel: string;
    secondButtonLink: string;
    image: string;
    video: string;
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const href = (link: string) => (link && !editing ? resolveHref(link, props.locale) : undefined);
</script>

<template>
  <section class="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-dark text-white">
    <video
      v-if="p.video && !reduced"
      :src="p.video"
      :poster="p.image || undefined"
      class="absolute inset-0 -z-20 h-full w-full object-cover"
      autoplay
      muted
      loop
      playsinline
    />
    <img v-else-if="p.image" :src="p.image" alt="" class="absolute inset-0 -z-20 h-full w-full object-cover" fetchpriority="high" />
    <div v-else class="photo-placeholder absolute inset-0 -z-20" />
    <div class="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/35 to-black/70" />

    <div class="mx-auto max-w-4xl px-6 pb-16 pt-32 text-center">
      <div v-reveal>
        <AtelierHeading :p="p" size="xl" tag="h1" center />
      </div>
      <p
        v-if="p.text || editing"
        v-reveal="{ delay: 150 }"
        class="mx-auto mt-7 max-w-md whitespace-pre-line text-sm leading-relaxed text-white/80 @3xl:text-base"
      >
        <EditableText :value="p.text" path="text" multiline placeholder="Text" />
      </p>
      <div v-reveal="{ delay: 300 }" class="mt-9 flex flex-wrap items-center justify-center gap-3">
        <component
          :is="href(p.buttonLink) ? 'a' : 'span'"
          v-if="p.buttonLabel || editing"
          :href="href(p.buttonLink)"
          class="rounded-[var(--radius-button)] bg-white/90 px-6 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-dark backdrop-blur transition hover:bg-white"
        >
          <EditableText :value="p.buttonLabel" path="buttonLabel" placeholder="Button" />
        </component>
        <component
          :is="href(p.secondButtonLink) ? 'a' : 'span'"
          v-if="p.secondButtonLabel || editing"
          :href="href(p.secondButtonLink)"
          class="rounded-[var(--radius-button)] border border-white/40 px-6 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur transition hover:bg-white/10"
        >
          <EditableText :value="p.secondButtonLabel" path="secondButtonLabel" placeholder="Second button" />
        </component>
      </div>
    </div>

    <i class="mdi mdi-chevron-down absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce text-2xl text-white/60" aria-hidden="true" />
  </section>
</template>
