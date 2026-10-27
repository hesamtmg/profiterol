<script setup lang="ts">
/**
 * The whitecotton.pt quotes: a deep brown panel with a centered two-tone title, then the quote cards spread in a
 * wide arc that curves away in depth. The middle one is lit cream; the others are dim glass. The arc turns by itself
 * (paused while pointed at) and with the round arrows. In the editor the cards are a plain row.
 */
import EditableText from '../../site/EditableText.vue';
import AtelierHeading from './AtelierHeading.vue';

interface Quote {
  quote: string;
  name: string;
  role: string;
}

const props = defineProps<{
  p: { eyebrow: string; title: string; titleItalic: string; quotes: Quote[]; seconds: number };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const rtl = computed(() => props.locale === 'fa');
const n = computed(() => props.p.quotes.length);
const active = ref(0);
const hovering = ref(false);

function go(step: number) {
  if (n.value) active.value = (active.value + step + n.value) % n.value;
}
/** Where each card sits relative to the lit one, wrapped so the arc has cards on both sides. */
function offset(i: number) {
  let d = i - active.value;
  if (d > n.value / 2) d -= n.value;
  if (d < -n.value / 2) d += n.value;
  return d;
}
function cardStyle(i: number) {
  const d = offset(i);
  const a = Math.abs(d);
  const x = d * (rtl.value ? -1 : 1);
  return {
    transform: `translateX(calc(-50% + ${x * 15}rem)) translateZ(${-a * 90}px) rotateY(${-x * 16}deg)`,
    opacity: a > 3 ? 0 : 1 - a * 0.22,
    zIndex: String(10 - a),
  };
}
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => Array.from(w)[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  if (editing || reduced.value || !(props.p.seconds > 0)) return;
  timer = setInterval(() => !hovering.value && go(1), props.p.seconds * 1000);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <section
    class="atelier-dark overflow-hidden px-6 py-20 text-white @3xl:py-28"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <div v-reveal class="mx-auto max-w-4xl"><AtelierHeading :p="p" size="xl" center /></div>

    <div v-if="editing" class="mx-auto mt-12 grid max-w-6xl gap-4 @3xl:grid-cols-3">
      <figure v-for="(q, i) in p.quotes" :key="i" class="rounded-xl bg-[#ece3d4] p-5 text-dark">
        <blockquote class="text-sm italic leading-relaxed rtl:not-italic">
          <EditableText :value="q.quote" :path="`quotes.${i}.quote`" multiline placeholder="Quote" />
        </blockquote>
        <figcaption class="mt-3 text-xs text-black/50">
          <EditableText :value="q.name" :path="`quotes.${i}.name`" placeholder="Name" />,
          <EditableText :value="q.role" :path="`quotes.${i}.role`" placeholder="Role" />
        </figcaption>
      </figure>
    </div>

    <template v-else>
      <div class="relative mx-auto mt-14 h-[20rem] max-w-6xl [perspective:1400px]" aria-live="polite">
        <figure
          v-for="(q, i) in p.quotes"
          :key="i"
          class="absolute left-1/2 top-6 w-[16rem] rounded-xl border p-5 transition-all duration-700 ease-out [transform-style:preserve-3d] @3xl:w-[17rem]"
          :class="
            offset(i) === 0
              ? 'border-transparent bg-[#ece3d4] text-dark shadow-2xl'
              : 'border-white/10 bg-white/[0.04] text-white/55 backdrop-blur-sm'
          "
          :style="cardStyle(i)"
          :aria-hidden="offset(i) !== 0"
          @click="active = i"
        >
          <span
            class="mb-3 grid h-8 w-8 place-items-center rounded-md text-[0.6rem] font-semibold"
            :class="offset(i) === 0 ? 'bg-[#a8927e] text-white' : 'bg-white/10'"
            >{{ initials(q.name) }}</span
          >
          <blockquote class="text-[0.8rem] italic leading-relaxed rtl:not-italic">“{{ q.quote }}”</blockquote>
          <figcaption
            class="mt-4 border-t pt-3 text-[0.7rem]"
            :class="offset(i) === 0 ? 'border-black/10 text-black/55' : 'border-white/10'"
          >
            — {{ q.name }}<template v-if="q.role">, {{ q.role }}</template>
          </figcaption>
        </figure>
      </div>
      <div v-if="n > 1" class="mt-4 flex justify-center gap-2">
        <button
          v-for="step in [-1, 1]"
          :key="step"
          type="button"
          class="grid h-8 w-8 place-items-center rounded-full border border-white/20 text-white/70 transition hover:bg-white/10 hover:text-white"
          :aria-label="step < 0 ? (locale === 'fa' ? 'قبلی' : 'Previous') : locale === 'fa' ? 'بعدی' : 'Next'"
          @click="go(rtl ? -step : step)"
        >
          <i class="mdi text-lg" :class="step < 0 ? 'mdi-chevron-left' : 'mdi-chevron-right'" />
        </button>
      </div>
    </template>
  </section>
</template>
