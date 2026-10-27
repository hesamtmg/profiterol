<script setup lang="ts">
/**
 * The whitecotton.pt fabric library: a big two-tone title over a grid of square material photos (six to a row on
 * wide screens, three on phones), each with its name and spec. Tapping one opens its details in a card under the
 * grid. A hint, a line and a dark button close it.
 */
import EditableText from '../../site/EditableText.vue';
import AtelierHeading from './AtelierHeading.vue';

interface Swatch {
  image: string;
  name: string;
  spec: string;
  text: string;
}

const props = defineProps<{
  p: {
    eyebrow: string;
    title: string;
    titleItalic: string;
    swatches: Swatch[];
    hint: string;
    note: string;
    buttonLabel: string;
    buttonLink: string;
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const href = (link: string) => (link && !editing ? resolveHref(link, props.locale) : undefined);
const open = ref<number | null>(null);
const chosen = computed(() => (open.value === null ? null : props.p.swatches[open.value]));
function toggle(i: number) {
  if (!editing) open.value = open.value === i ? null : i;
}
</script>

<template>
  <section class="atelier-paper px-6 py-20 text-ink @3xl:px-14 @3xl:py-28">
    <div class="mx-auto max-w-6xl">
      <div v-reveal><AtelierHeading :p="p" size="xl" /></div>

      <div class="mt-12 grid grid-cols-3 gap-x-3 gap-y-6 @3xl:grid-cols-6 @3xl:gap-x-4">
        <button
          v-for="(s, i) in p.swatches"
          :key="i"
          v-reveal="{ delay: (i % 6) * 60 }"
          type="button"
          class="group text-start"
          :aria-expanded="open === i"
          @click="toggle(i)"
        >
          <span
            class="block aspect-square overflow-hidden rounded-xl ring-offset-2 ring-offset-[var(--c-surface)] transition"
            :class="open === i ? 'ring-2 ring-primary' : ''"
          >
            <img
              v-if="s.image"
              :src="s.image"
              :alt="s.name"
              class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <span v-else class="photo-placeholder block h-full w-full opacity-60" />
          </span>
          <span class="mt-2 block text-[0.7rem] leading-snug @3xl:text-xs">
            <EditableText :value="s.name" :path="`swatches.${i}.name`" placeholder="Name" />
          </span>
          <span v-if="s.spec || editing" class="block text-[0.65rem] text-muted @3xl:text-xs">
            <EditableText :value="s.spec" :path="`swatches.${i}.spec`" placeholder="Spec" />
          </span>
        </button>
      </div>

      <Transition name="swatch">
        <div v-if="chosen" class="mx-auto mt-8 flex max-w-2xl items-start gap-5 rounded-[1.25rem] bg-white/80 p-5 shadow-lg backdrop-blur">
          <img v-if="chosen.image" :src="chosen.image" alt="" class="h-20 w-20 shrink-0 rounded-lg object-cover" />
          <div class="min-w-0 flex-1">
            <p class="font-medium">
              {{ chosen.name }} <span class="ms-2 text-sm text-muted">{{ chosen.spec }}</span>
            </p>
            <p v-if="chosen.text" class="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{{ chosen.text }}</p>
          </div>
          <button type="button" class="text-muted hover:text-ink" :aria-label="locale === 'fa' ? 'بستن' : 'Close'" @click="open = null">
            <i class="mdi mdi-close text-lg" />
          </button>
        </div>
      </Transition>

      <p v-if="p.hint || editing" class="mt-8 text-center text-[0.6rem] uppercase tracking-[0.3em] text-muted">
        <EditableText :value="p.hint" path="hint" placeholder="Hint" />
      </p>
      <div class="mt-12 text-center">
        <p v-if="p.note || editing" class="text-sm text-muted"><EditableText :value="p.note" path="note" placeholder="Line" /></p>
        <component
          :is="href(p.buttonLink) ? 'a' : 'span'"
          v-if="p.buttonLabel || editing"
          :href="href(p.buttonLink)"
          class="mt-5 inline-block rounded-[var(--radius-button)] bg-dark px-7 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-primary"
        >
          <EditableText :value="p.buttonLabel" path="buttonLabel" placeholder="Button" />
        </component>
      </div>
    </div>
  </section>
</template>

<style scoped>
.swatch-enter-active,
.swatch-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.swatch-enter-from,
.swatch-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
