<script setup lang="ts">
/**
 * The mikewilcockdesign.com first screen: three small labels across the top, a huge condensed name on two lines,
 * the first pushed to the start and the second to the end, each rising out of its own mask; a short text, a scroll
 * hint and an outlined button along the bottom. The rise is pure CSS, so it plays on the served page before any
 * script runs; the editor and visitors who turn off motion see it still.
 */
import { getLocale } from '@profiterol/blocks';
import EditableText from '../../site/EditableText.vue';
import { folioColors, folioLabel } from './look';

const props = defineProps<{
  p: {
    labelStart: string;
    labelMiddle: string;
    labelEnd: string;
    first: string;
    second: string;
    text: string;
    hint: string;
    buttonLabel: string;
    buttonLink: string;
    look: string;
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const colors = computed(() => folioColors(props.p.look));

/** Long names get smaller letters, so the longest line fits the width; measured in the browser to be sure. */
const size = computed(() => {
  const longest = Math.max(String(props.p.first ?? '').length, String(props.p.second ?? '').length, 4);
  // Persian letters stand much taller than Latin capitals of the same size.
  const most = getLocale(props.locale)?.dir === 'rtl' ? 16 : 27;
  return `clamp(2.5rem, ${Math.min(most, 175 / longest)}cqw, 22rem)`;
});
const heading = ref<HTMLElement | null>(null);
const fit = useFitWidth(
  heading,
  () => [...(heading.value?.querySelectorAll<HTMLElement>('.line') ?? [])],
  () => [props.p.first, props.p.second],
);
</script>

<template>
  <section class="flex min-h-[100svh] flex-col px-5 pb-8 pt-24 @3xl:px-14 @3xl:pb-10 @3xl:pt-32" :class="colors.panel">
    <div class="grid grid-cols-2 gap-4 opacity-60 @3xl:grid-cols-3" :class="folioLabel">
      <span><EditableText :value="p.labelStart" path="labelStart" placeholder="(Label)" /></span>
      <span class="hidden text-center @3xl:block"><EditableText :value="p.labelMiddle" path="labelMiddle" placeholder="Label" /></span>
      <span class="text-end"><EditableText :value="p.labelEnd" path="labelEnd" placeholder="Label" /></span>
    </div>

    <h1
      ref="heading"
      class="name my-auto whitespace-nowrap py-10 font-extrabold uppercase leading-[0.86] tracking-[-0.02em] rtl:leading-[0.95] rtl:tracking-normal"
      :style="{ fontSize: `calc(${size} * ${fit})` }"
    >
      <span class="block overflow-hidden pb-[0.02em] rtl:pb-[0.2em]">
        <span class="line block" :class="editing ? '' : 'rise'">
          <EditableText :value="p.first" path="first" placeholder="First" />
        </span>
      </span>
      <span v-if="p.second || editing" class="block overflow-hidden pb-[0.02em] text-end rtl:pb-[0.2em]">
        <span class="line block" :class="editing ? '' : 'rise'" style="animation-delay: 140ms">
          <EditableText :value="p.second" path="second" placeholder="Second" />
        </span>
      </span>
    </h1>

    <div class="grid items-end gap-8 @3xl:grid-cols-3" :class="editing ? '' : 'fade'">
      <p v-if="p.text || editing" class="max-w-md text-lg leading-snug @3xl:text-[1.35rem]">
        <EditableText :value="p.text" path="text" multiline />
      </p>
      <span v-else />
      <span class="hidden text-center opacity-60 @3xl:block" :class="folioLabel">
        <EditableText :value="p.hint" path="hint" placeholder="↓ Scroll" />
      </span>
      <div v-if="p.buttonLabel || editing" class="@3xl:text-end">
        <a
          :href="editing ? undefined : resolveHref(p.buttonLink, locale)"
          class="inline-flex items-center rounded-full border border-[color-mix(in_srgb,currentColor_30%,transparent)] px-7 py-4 transition-colors duration-300 hover:border-primary hover:bg-primary hover:text-dark"
          :class="folioLabel"
        >
          <EditableText :value="p.buttonLabel" path="buttonLabel" placeholder="Button" />
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Narrower letters when the font has a width axis (Archivo, in the Folio Night theme). */
.name {
  font-stretch: 72%;
}
.rise {
  animation: rise 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@keyframes rise {
  from {
    transform: translateY(105%);
  }
}
.fade {
  animation: fade 1s ease-out 0.6s both;
}
@keyframes fade {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .rise,
  .fade {
    animation: none;
  }
}
</style>
