<script setup lang="ts">
/**
 * minicms kind 4: half photo, half text. A big title with a two-line label beside it, short paragraphs
 * that open fully on hover, and a frosted button.
 */
import { getLocale } from '@profiterol/blocks';
import EditableText from '../../site/EditableText.vue';
import ResponsiveImg from '../../site/ResponsiveImg.vue';

const props = defineProps<{
  p: {
    image: string;
    mobileImage: string;
    imageSide: string;
    bigTitle: string;
    smallTitle: string;
    lines: { text: string }[];
    buttonLabel: string;
    buttonLink: string;
  };
  locale: string;
}>();

const editing = Boolean(useBlockEditing());
const dir = computed(() => getLocale(props.locale)?.dir ?? 'ltr');
const labelWords = computed(() => String(props.p.smallTitle ?? '').split(/\s+/).filter(Boolean));
</script>

<template>
  <section class="flex w-full flex-col overflow-x-clip bg-surface text-ink @3xl:min-h-[80dvh] @3xl:flex-row" dir="ltr">
    <div v-reveal="{ from: p.imageSide === 'left' ? 'left' : 'right' }" class="relative h-80 @3xl:h-auto @3xl:w-1/2" :class="{ '@3xl:order-2': p.imageSide !== 'left' }">
      <ResponsiveImg v-if="p.image || p.mobileImage" :src="p.image" :mobile="p.mobileImage" img-class="absolute inset-0 h-full w-full object-cover" />
      <div v-else class="photo-placeholder absolute inset-0" />
    </div>

    <div class="flex flex-col items-center justify-center gap-2 px-2 py-10 @3xl:w-1/2 @3xl:p-4" :dir="dir">
      <div v-reveal class="flex w-full items-center justify-center gap-2 text-center @3xl:pt-10">
        <h3 class="text-5xl font-medium @3xl:text-6xl @5xl:text-7xl"><EditableText :value="p.bigTitle" path="bigTitle" placeholder="12" /></h3>
        <div v-if="editing" class="text-start text-base @3xl:text-xl">
          <EditableText :value="p.smallTitle" path="smallTitle" placeholder="Two words" />
        </div>
        <div v-else class="text-start text-base leading-tight @3xl:text-xl">
          <p v-for="(w, i) in labelWords" :key="i">{{ w }}</p>
        </div>
      </div>

      <p
        v-for="(line, i) in p.lines"
        :key="i"
        v-reveal="{ delay: 100 + i * 100 }"
        tabindex="0"
        class="w-full max-w-xl px-6 py-2 text-sm font-extralight transition-all duration-700 @3xl:text-base"
        :class="editing ? '' : 'max-h-16 overflow-hidden hover:max-h-96 hover:font-bold focus:max-h-96 focus:font-bold focus:outline-none'"
      >
        <EditableText :value="line.text" :path="`lines.${i}.text`" multiline />
      </p>

      <a
        v-if="p.buttonLabel"
        v-reveal="{ delay: 400 }"
        :href="editing ? undefined : resolveHref(p.buttonLink, locale)"
        class="glass mx-auto mb-10 mt-6 flex h-[50px] w-48 items-center justify-center rounded-full px-3 text-sm font-medium transition hover:scale-105"
        style="background-color: color-mix(in srgb, var(--c-primary) 14%, transparent)"
      >
        <EditableText :value="p.buttonLabel" path="buttonLabel" />
      </a>
    </div>
  </section>
</template>
