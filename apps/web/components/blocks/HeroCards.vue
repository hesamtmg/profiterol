<script setup lang="ts">
/**
 * The expanding person cards from amsr-portfolio: the active card grows and shows its photo and text,
 * the others fold into colored strips with a big letter. Hovering a strip nudges it; clicking opens it.
 */
import Marquee from './Marquee.vue';

interface Card {
  title: string;
  text: string;
  image: string;
  letter: string;
  color: string;
  buttonLabel: string;
  buttonLink: string;
}

const props = defineProps<{ p: { cards: Card[]; marquee: string }; locale: string }>();
const active = ref(0);

function background(card: Card) {
  const color = card.color || 'var(--c-primary)';
  return card.image
    ? `linear-gradient(to top, rgb(0 0 0 / .65), rgb(0 0 0 / .05) 60%), url("${encodeURI(card.image)}") center / cover`
    : `radial-gradient(circle at 20% 20%, color-mix(in srgb, ${color} 70%, white), ${color} 45%, color-mix(in srgb, ${color} 55%, black))`;
}

const cards = computed(() => props.p.cards ?? []);
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div class="panel overflow-hidden p-3 @3xl:p-5">
      <div class="flex h-[78vh] min-h-[520px] flex-col gap-3 @3xl:h-[72vh] @3xl:flex-row">
        <div
          v-for="(card, i) in cards"
          :key="i"
          class="group relative overflow-hidden rounded-[1.75rem] text-white transition-all duration-1000 ease-in-out @3xl:rounded-[3rem]"
          :class="
            i === active
              ? 'flex-[1_1_0%]'
              : 'flex-[0_0_4.5rem] cursor-pointer hover:flex-[0_0_6rem] @3xl:flex-[0_0_8rem] @3xl:hover:flex-[0_0_10rem]'
          "
          :style="i === active ? { background: background(card) } : { background: card.color || 'var(--c-secondary)' }"
          :role="i === active ? undefined : 'button'"
          :tabindex="i === active ? undefined : 0"
          :aria-label="i === active ? undefined : card.title"
          @click="active = i"
          @keydown.enter="active = i"
        >
          <!-- Folded strip -->
          <div
            class="absolute inset-0 flex items-center justify-center transition-opacity duration-700"
            :class="i === active ? 'pointer-events-none opacity-0' : 'opacity-100'"
          >
            <span class="text-4xl font-black opacity-90 @3xl:text-7xl">{{ card.letter || card.title?.[0] }}</span>
          </div>

          <!-- Expanded content -->
          <div
            class="absolute inset-x-0 bottom-0 flex flex-col items-start gap-4 p-6 transition-all duration-1000 @3xl:max-w-2xl @3xl:p-12"
            :class="i === active ? 'translate-y-0 opacity-100 delay-300' : 'pointer-events-none translate-y-8 opacity-0'"
          >
            <h1 class="text-4xl font-black leading-tight @3xl:text-6xl">{{ card.title }}</h1>
            <p class="text-base font-extralight leading-relaxed @3xl:text-xl">{{ card.text }}</p>
            <a
              v-if="card.buttonLabel"
              :href="resolveHref(card.buttonLink, locale)"
              class="btn-pill bg-white text-dark hover:scale-105 hover:shadow-xl"
            >
              {{ card.buttonLabel }}
              <i class="mdi mdi-arrow-right rtl:rotate-180" />
            </a>
          </div>
        </div>
      </div>
      <Marquee v-if="p.marquee" :p="{ text: p.marquee, seconds: 30 }" bare />
    </div>
  </section>
</template>
