<script setup lang="ts">
/**
 * The whitecotton.pt "capabilities": a two-tone title, then one big dark card per technique. The cards stick below
 * the header and pile up while scrolling, the ones underneath shrinking back a little. Each shows two framed photos
 * with a caption plate (like gallery labels) and, over a shadow at the bottom, its number, title, text and link.
 * In the editor and for visitors who turn off motion they are a plain list.
 */
import EditableText from '../../site/EditableText.vue';
import AtelierHeading from './AtelierHeading.vue';

interface Card {
  title: string;
  text: string;
  image: string;
  imageTitle: string;
  imageNote: string;
  image2: string;
  image2Title: string;
  image2Note: string;
  linkLabel: string;
  link: string;
}

const props = defineProps<{
  p: { eyebrow: string; title: string; titleItalic: string; cards: Card[]; footnote: string; buttonLabel: string; buttonLink: string };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const stacked = computed(() => !editing && !reduced.value);
const href = (link: string) => (link && !editing ? resolveHref(link, props.locale) : undefined);

const cardEls = ref<HTMLElement[]>([]);
/** How much each card is covered by the ones after it (0–1). */
const covered = ref<number[]>([]);
useScrollFrame(() => {
  const vh = window.innerHeight;
  covered.value = cardEls.value.map((_, i) => {
    const next = cardEls.value[i + 1];
    return next ? between(vh - next.getBoundingClientRect().top, 0, vh * 0.8) : 0;
  });
});
function cardStyle(i: number) {
  if (!stacked.value) return {};
  const c = covered.value[i] ?? 0;
  return { transform: `scale(${1 - c * 0.05})`, filter: `brightness(${1 - c * 0.35})` };
}

const pad = (i: number) => String(i + 1).padStart(2, '0');
const frames = (card: Card, i: number) =>
  [
    { image: card.image, title: card.imageTitle, note: card.imageNote, key: 'image' },
    { image: card.image2, title: card.image2Title, note: card.image2Note, key: 'image2' },
  ]
    .filter((f) => f.image || editing)
    .map((f) => ({ ...f, path: `cards.${i}.${f.key}` }));
</script>

<template>
  <section class="atelier-paper px-4 py-20 text-ink @3xl:px-14 @3xl:py-28">
    <div class="mx-auto max-w-6xl">
      <div v-reveal class="px-2"><AtelierHeading :p="p" size="xl" /></div>

      <div class="mt-12" :class="stacked ? '' : 'space-y-4'">
        <div
          v-for="(card, i) in p.cards"
          :key="i"
          :ref="(el) => el && (cardEls[i] = el as HTMLElement)"
          :class="stacked ? 'sticky mb-6 last:mb-0' : ''"
          :style="stacked ? { top: `calc(5.5rem + ${i * 0.6}rem)` } : undefined"
        >
          <article
            class="relative flex h-[34rem] origin-top flex-col overflow-hidden rounded-[1.25rem] bg-[#0d0a09] text-white shadow-[0_-20px_60px_-30px_rgb(0_0_0/0.6)] will-change-transform @3xl:h-[30rem]"
            :style="cardStyle(i)"
          >
            <span class="absolute start-5 top-4 z-10 text-[0.6rem] tracking-[0.3em] text-white/30">{{ pad(i) }}</span>
            <!-- Two framed photos, each with a small caption plate on top -->
            <div class="grid flex-1 grid-cols-1 gap-3 px-5 pt-10 @3xl:grid-cols-2 @3xl:px-[18%] @3xl:pt-5">
              <figure
                v-for="(f, k) in frames(card, i)"
                :key="f.key"
                class="relative overflow-hidden border border-white/10 bg-[#1a1412]"
                :class="k ? 'hidden @3xl:block' : ''"
              >
                <figcaption
                  v-if="f.title || f.note"
                  class="absolute inset-x-3 top-3 z-10 bg-black/70 px-3 py-1.5 text-center backdrop-blur"
                >
                  <span class="block text-[0.7rem] ltr:font-serif uppercase tracking-[0.12em] text-white/85">{{ f.title }}</span>
                  <span v-if="f.note" class="block text-[0.5rem] tracking-wide text-white/50">{{ f.note }}</span>
                </figcaption>
                <img v-if="f.image" :src="f.image" alt="" class="h-full w-full object-cover opacity-90" loading="lazy" />
                <div v-else class="photo-placeholder h-full w-full opacity-40" />
              </figure>
            </div>
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-6 pb-7 pt-24 @3xl:px-8">
              <h3 class="text-3xl font-medium tracking-tight @3xl:text-5xl">
                <EditableText :value="card.title" :path="`cards.${i}.title`" placeholder="Title" />
              </h3>
              <p v-if="card.text || editing" class="mt-3 max-w-sm whitespace-pre-line text-xs leading-relaxed text-white/60">
                <EditableText :value="card.text" :path="`cards.${i}.text`" multiline placeholder="Text" />
              </p>
              <component
                :is="href(card.link) ? 'a' : 'span'"
                v-if="card.linkLabel || editing"
                :href="href(card.link)"
                class="mt-4 inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.28em] text-white/50 hover:text-white"
              >
                <EditableText :value="card.linkLabel" :path="`cards.${i}.linkLabel`" placeholder="Link" />
                <i class="mdi mdi-arrow-right rtl:rotate-180" />
              </component>
            </div>
          </article>
        </div>
      </div>

      <div
        v-if="p.footnote || p.buttonLabel || editing"
        class="mt-8 flex items-center justify-between gap-4 border-t border-black/10 px-2 pt-5"
      >
        <p class="text-[0.6rem] uppercase tracking-[0.3em] text-muted">
          <EditableText :value="p.footnote" path="footnote" placeholder="Small line" />
        </p>
        <component
          :is="href(p.buttonLink) ? 'a' : 'span'"
          :href="href(p.buttonLink)"
          class="inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.28em] text-muted hover:text-primary"
        >
          <EditableText :value="p.buttonLabel" path="buttonLabel" placeholder="Link" />
          <i class="mdi mdi-arrow-right rtl:rotate-180" />
        </component>
      </div>
    </div>
  </section>
</template>
