<script setup lang="ts">
/**
 * The amsr-portfolio first screen: a full-screen photo of the active person, their name, headline and
 * button at the bottom, and the other people as tall pill-shaped cards at the side. Clicking a card
 * cross-fades to that person. The layout keeps its side in every language because the photos are
 * composed for it; only the text direction follows the language.
 */
import { getLocale } from '@profiterol/blocks';
import EditableText from '../site/EditableText.vue';

interface Person {
  name: string;
  headline: string;
  text: string;
  photo: string;
  mobilePhoto: string;
  cardPhoto: string;
  cardLogo: string;
  color: string;
  buttonLabel: string;
  buttonLink: string;
}

const props = defineProps<{
  p: { people: Person[]; marquee: string; textSide: string; scrollHint: boolean };
  locale: string;
}>();

const editing = Boolean(useBlockEditing());
const root = ref<HTMLElement | null>(null);
const active = ref(0);
// Side cards slide in a moment after the page loads and after every switch.
const cardsIn = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

const people = computed(() => props.p.people ?? []);
const current = computed(() => people.value[active.value] ?? people.value[0]);
const others = computed(() => people.value.map((person, i) => ({ person, i })).filter(({ i }) => i !== active.value));
const textLeft = computed(() => props.p.textSide !== 'right');
const dir = computed(() => getLocale(props.locale)?.dir ?? 'ltr');

/** The side cards wear the active person's color, as in the original design. */
const cardColor = computed(() => current.value?.color || 'var(--c-secondary)');

/** The button takes the color of the next person, as in the original design. */
const buttonColor = computed(() => {
  const next = people.value[(active.value + 1) % Math.max(people.value.length, 1)];
  return next?.color || 'var(--c-secondary)';
});

function show(i: number) {
  if (i === active.value) return;
  clearTimeout(timer);
  cardsIn.value = false;
  active.value = i;
  timer = setTimeout(() => (cardsIn.value = true), 1000);
}

function scrollNext() {
  root.value?.parentElement?.nextElementSibling?.scrollIntoView({ behavior: 'smooth' });
}

// Keep the active person valid when people are removed in the editor.
watch(
  () => people.value.length,
  (n) => {
    if (active.value >= n) active.value = 0;
  },
);

onMounted(() => (timer = setTimeout(() => (cardsIn.value = true), 600)));
onBeforeUnmount(() => clearTimeout(timer));

function fallback(color: string) {
  const c = color || 'var(--c-primary)';
  return `radial-gradient(circle at 70% 30%, color-mix(in srgb, ${c} 75%, white), ${c} 40%, color-mix(in srgb, ${c} 35%, black))`;
}
</script>

<template>
  <section ref="root" class="relative isolate h-[100dvh] min-h-[560px] w-full overflow-clip bg-black text-white" dir="ltr">
    <!-- Background photos, cross-fading -->
    <div
      v-for="(person, i) in people"
      :key="`bg-${i}`"
      class="absolute inset-0 transition-opacity duration-1000 ease-in-out"
      :class="i === active ? 'opacity-100' : 'opacity-0'"
      aria-hidden="true"
    >
      <template v-if="person.photo || person.mobilePhoto">
        <img
          :src="person.photo || person.mobilePhoto"
          alt=""
          class="absolute inset-0 h-full w-full object-cover"
          :class="{ 'hidden @3xl:block': person.mobilePhoto }"
          :loading="i === 0 ? 'eager' : 'lazy'"
        />
        <img
          v-if="person.mobilePhoto"
          :src="person.mobilePhoto"
          alt=""
          class="absolute inset-0 h-full w-full object-cover @3xl:hidden"
          :loading="i === 0 ? 'eager' : 'lazy'"
        />
      </template>
      <div v-else class="absolute inset-0" :style="{ background: fallback(person.color) }" />
    </div>
    <div class="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" aria-hidden="true" />

    <!-- Name, headline, text and button of the active person -->
    <Transition
      mode="out-in"
      enter-active-class="transition-all duration-700 ease-out"
      leave-active-class="transition-all duration-300 ease-in"
      enter-from-class="opacity-0 translate-y-4"
      leave-to-class="opacity-0"
    >
      <div
        v-if="current"
        :key="active"
        class="absolute bottom-24 z-10 max-w-[calc(100%-6.5rem)] @3xl:bottom-28 @3xl:max-w-[52rem]"
        :class="textLeft ? 'left-6 @3xl:left-[10%]' : 'right-6 @3xl:right-[10%]'"
        :dir="dir"
        :lang="locale"
      >
        <h1 class="text-4xl font-black leading-tight drop-shadow-sm @3xl:text-6xl">
          <EditableText :value="current.name" :path="`people.${active}.name`" />
        </h1>
        <h2 v-if="current.headline || editing" class="mt-3 text-base font-bold @3xl:text-2xl">
          <EditableText :value="current.headline" :path="`people.${active}.headline`" placeholder="Headline" />
        </h2>
        <p v-if="current.text || editing" class="mt-1 max-w-[46rem] text-xs font-light leading-relaxed opacity-90 @3xl:text-base">
          <EditableText :value="current.text" :path="`people.${active}.text`" multiline />
        </p>
        <a
          v-if="current.buttonLabel"
          :href="resolveHref(current.buttonLink, locale)"
          class="mt-4 inline-flex w-full max-w-[26rem] items-center justify-center rounded-[var(--radius-button)] px-8 py-2.5 text-sm font-medium text-white shadow-lg transition hover:scale-[1.02] hover:brightness-110 @3xl:text-base"
          :style="{ background: buttonColor }"
        >
          <EditableText :value="current.buttonLabel" :path="`people.${active}.buttonLabel`" />
        </a>
      </div>
    </Transition>

    <!-- The other people, as tall cards at the side -->
    <div
      class="absolute bottom-10 z-20 flex gap-3"
      :class="textLeft ? 'right-2 @3xl:-right-20' : 'left-2 flex-row-reverse @3xl:-left-20'"
    >
      <button
        v-for="{ person, i } in others"
        :key="`card-${i}`"
        type="button"
        class="relative h-[50dvh] w-14 overflow-hidden rounded-full transition-all duration-1000 ease-in-out @3xl:h-[78dvh] @3xl:w-28"
        :class="[
          cardsIn ? 'opacity-100' : textLeft ? 'opacity-0 @3xl:translate-x-20' : 'opacity-0 @3xl:-translate-x-20',
          textLeft ? '@3xl:hover:-translate-x-24' : '@3xl:hover:translate-x-24',
        ]"
        :style="{ background: cardColor, boxShadow: `0 25px 50px -12px ${cardColor}` }"
        :aria-label="person.name"
        :title="person.name"
        @click.stop="show(i)"
      >
        <span class="absolute inset-x-0 top-8 flex justify-center" :class="textLeft ? '@3xl:justify-start @3xl:ps-2' : '@3xl:justify-end @3xl:pe-2'">
          <img v-if="person.cardLogo" :src="person.cardLogo" alt="" class="h-32 w-10 object-contain @3xl:h-48 @3xl:w-7" style="filter: brightness(0) invert(1)" />
          <span v-else class="text-xs font-black uppercase tracking-[0.2em] [writing-mode:vertical-rl] @3xl:w-7 @3xl:text-sm" :dir="dir">{{ person.name }}</span>
        </span>
        <span
          v-if="person.cardPhoto"
          class="absolute inset-x-0 bottom-0 h-1/2 bg-contain bg-bottom bg-no-repeat"
          :style="{ backgroundImage: `url(&quot;${encodeURI(person.cardPhoto)}&quot;)` }"
          aria-hidden="true"
        />
      </button>
    </div>

    <!-- Moving text -->
    <div v-if="p.marquee" class="pointer-events-none absolute inset-x-0 bottom-0 z-10 overflow-hidden" aria-hidden="true">
      <div
        class="animate-marquee inline-block whitespace-nowrap ps-[100%] text-4xl font-extralight text-white/40 @3xl:text-6xl"
        :class="{ 'pointer-events-auto !ps-6': editing }"
        :style="editing ? {} : { animation: 'marquee 30s linear infinite' }"
      >
        <EditableText :value="p.marquee" path="marquee" />
      </div>
    </div>

    <!-- Scroll hint -->
    <button
      v-if="p.scrollHint"
      type="button"
      class="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 animate-bounce p-2 text-3xl text-white/90"
      aria-label="Scroll down"
      @click.stop="scrollNext"
    >
      <i class="mdi mdi-mouse-move-down" />
    </button>
  </section>
</template>
