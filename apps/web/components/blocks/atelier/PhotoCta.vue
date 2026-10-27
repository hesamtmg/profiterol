<script setup lang="ts">
/**
 * The whitecotton.pt closing panel: a tall darkened photo of the place with a centered two-tone title and text, a row
 * of big facts between thin rules, a light button, and up to four link columns along the bottom.
 */
import EditableText from '../../site/EditableText.vue';
import AtelierHeading from './AtelierHeading.vue';

interface Column {
  title: string;
  text: string;
  linkLabel: string;
  link: string;
}

const props = defineProps<{
  p: {
    eyebrow: string;
    title: string;
    titleItalic: string;
    text: string;
    image: string;
    stats: { value: string; label: string }[];
    buttonLabel: string;
    buttonLink: string;
    columns: Column[];
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const href = (link: string) => (link && !editing ? resolveHref(link, props.locale) : undefined);
</script>

<template>
  <section class="relative isolate overflow-hidden bg-dark px-6 pb-12 pt-24 text-white @3xl:px-14 @3xl:pt-32">
    <img v-if="p.image" :src="p.image" alt="" class="absolute inset-0 -z-20 h-full w-full object-cover" loading="lazy" />
    <div v-else class="photo-placeholder absolute inset-0 -z-20" />
    <div class="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/60 to-black/85" />

    <div class="mx-auto max-w-4xl text-center">
      <div v-reveal><AtelierHeading :p="p" size="xl" center /></div>
      <p
        v-if="p.text || editing"
        v-reveal="{ delay: 120 }"
        class="mx-auto mt-6 max-w-md whitespace-pre-line text-sm leading-relaxed text-white/70"
      >
        <EditableText :value="p.text" path="text" multiline placeholder="Text" />
      </p>

      <div
        v-if="p.stats.length"
        class="mt-12 grid grid-cols-2 border-y border-white/15"
        :class="p.stats.length === 3 ? '@2xl:grid-cols-3' : '@2xl:grid-cols-4'"
      >
        <div v-for="(s, i) in p.stats" :key="i" v-reveal="{ delay: i * 90 }" class="px-3 py-6">
          <p class="text-3xl font-medium tracking-tight @3xl:text-4xl">
            <EditableText :value="s.value" :path="`stats.${i}.value`" placeholder="Number" />
          </p>
          <p class="mt-1 text-[0.6rem] uppercase tracking-[0.25em] text-white/55">
            <EditableText :value="s.label" :path="`stats.${i}.label`" placeholder="Label" />
          </p>
        </div>
      </div>

      <component
        :is="href(p.buttonLink) ? 'a' : 'span'"
        v-if="p.buttonLabel || editing"
        :href="href(p.buttonLink)"
        class="mt-10 inline-block rounded-[var(--radius-button)] bg-white/90 px-7 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-dark transition hover:bg-white"
      >
        <EditableText :value="p.buttonLabel" path="buttonLabel" placeholder="Button" />
      </component>
    </div>

    <div
      v-if="p.columns.length"
      class="mx-auto mt-20 grid max-w-6xl gap-8 border-t border-white/10 pt-10 text-center @2xl:grid-cols-2 @4xl:grid-cols-4"
    >
      <div v-for="(c, i) in p.columns" :key="i">
        <p class="text-sm font-medium"><EditableText :value="c.title" :path="`columns.${i}.title`" placeholder="Title" /></p>
        <p class="mt-2 text-xs leading-relaxed text-white/55">
          <EditableText :value="c.text" :path="`columns.${i}.text`" placeholder="Text" />
        </p>
        <component
          :is="href(c.link) ? 'a' : 'span'"
          v-if="c.linkLabel || editing"
          :href="href(c.link)"
          class="mt-3 inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.25em] text-white/60 hover:text-white"
        >
          <EditableText :value="c.linkLabel" :path="`columns.${i}.linkLabel`" placeholder="Link" />
          <i class="mdi mdi-arrow-right rtl:rotate-180" />
        </component>
      </div>
    </div>
  </section>
</template>
