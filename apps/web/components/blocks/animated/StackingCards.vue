<script setup lang="ts">
/**
 * Big cards that stick near the top of the screen one after another, so each new card slides over the last;
 * the ones underneath shrink and dim a little for every card on top of them. In the editor and for visitors
 * who turn off motion they are a plain list of cards.
 */
import EditableText from '../../site/EditableText.vue';

interface Card {
  image: string;
  eyebrow: string;
  title: string;
  text: string;
  color: string;
  buttonLabel: string;
  buttonLink: string;
}

const props = defineProps<{ p: { title: string; cards: Card[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const stacked = computed(() => !editing && !reduced.value);
const cardEls = ref<HTMLElement[]>([]);
/** How many cards lie on top of each one, counting a card on its way up as a fraction. */
const depth = ref<number[]>([]);

useScrollFrame(() => {
  const vh = window.innerHeight;
  const covers = cardEls.value.map((el) => {
    const stick = parseFloat(getComputedStyle(el).top) || 0;
    // 0 while the card is below the screen, 1 once it has reached its sticking point.
    return between(vh - el.getBoundingClientRect().top, 0, vh - stick);
  });
  depth.value = covers.map((_, i) => covers.slice(i + 1).reduce((sum, c) => sum + c, 0));
});

function cardStyle(i: number) {
  const d = stacked.value ? (depth.value[i] ?? 0) : 0;
  return { transform: `scale(${1 - Math.min(d, 4) * 0.05})`, background: props.p.cards[i]?.color || 'var(--c-dark)' };
}
const shade = (i: number) => (stacked.value ? Math.min(depth.value[i] ?? 0, 3) * 0.18 : 0);
</script>

<template>
  <section class="bg-surface px-4 py-20 text-ink @3xl:px-16 @3xl:py-28">
    <div class="mx-auto max-w-6xl">
      <h2 v-if="p.title || editing" class="mb-10 text-center text-3xl font-black @3xl:mb-16 @3xl:text-5xl">
        <EditableText :value="p.title" path="title" placeholder="Title" />
      </h2>

      <div class="space-y-6" :class="{ 'pb-[10vh]': stacked }">
        <div
          v-for="(card, i) in p.cards"
          :key="i"
          :ref="(el) => el && (cardEls[i] = el as HTMLElement)"
          :class="stacked ? 'sticky' : ''"
          :style="stacked ? { top: `calc(12vh + ${i * 1.25}rem)` } : undefined"
        >
          <article
            class="relative grid min-h-[60vh] origin-top overflow-hidden rounded-[2rem] text-white shadow-2xl will-change-transform @3xl:grid-cols-2"
            :style="cardStyle(i)"
          >
            <div class="relative z-10 flex flex-col justify-end gap-4 p-8 @3xl:justify-center @3xl:p-14">
              <p v-if="card.eyebrow || editing" class="font-mono text-sm uppercase tracking-widest opacity-70">
                <EditableText :value="card.eyebrow" :path="`cards.${i}.eyebrow`" placeholder="Small line" />
              </p>
              <h3 class="text-4xl font-black leading-tight @3xl:text-6xl">
                <EditableText :value="card.title" :path="`cards.${i}.title`" />
              </h3>
              <p v-if="card.text || editing" class="max-w-md text-lg font-light opacity-85">
                <EditableText :value="card.text" :path="`cards.${i}.text`" multiline />
              </p>
              <a
                v-if="card.buttonLabel"
                :href="editing ? undefined : resolveHref(card.buttonLink, locale)"
                class="glass mt-2 inline-flex w-fit items-center gap-2 rounded-[var(--radius-button)] px-6 py-3 text-sm font-semibold transition hover:scale-105"
              >
                <EditableText :value="card.buttonLabel" :path="`cards.${i}.buttonLabel`" />
                <i class="mdi mdi-arrow-right rtl:rotate-180" />
              </a>
            </div>
            <div class="relative order-first h-56 @3xl:order-none @3xl:h-auto">
              <img
                v-if="card.image"
                :src="card.image"
                :alt="card.title"
                class="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              <div v-else class="photo-placeholder absolute inset-0 opacity-80" />
            </div>
            <!-- Dims the card as others pile on top -->
            <div class="pointer-events-none absolute inset-0 z-20 bg-black" :style="{ opacity: shade(i) }" aria-hidden="true" />
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
