<script setup lang="ts">
/**
 * Glowing colors drifting behind a headline. The headline's words rise in one by one, the last word keeps
 * changing, and a soft light follows the mouse. Everything holds still for visitors who turn off motion.
 */
import EditableText from '../../site/EditableText.vue';

const props = defineProps<{
  p: {
    eyebrow: string;
    title: string;
    words: string;
    text: string;
    buttonLabel: string;
    buttonLink: string;
    secondButtonLabel: string;
    secondButtonLink: string;
    color: string;
    look: string;
  };
  locale: string;
}>();

const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const root = ref<HTMLElement | null>(null);
const dark = computed(() => props.p.look !== 'light');
const titleWords = computed(() => String(props.p.title ?? '').split(/\s+/).filter(Boolean));
const changing = computed(() =>
  String(props.p.words ?? '')
    .split(/[,،]/)
    .map((w) => w.trim())
    .filter(Boolean),
);
const index = ref(0);
const word = computed(() => changing.value[index.value % Math.max(changing.value.length, 1)] ?? '');
let timer: ReturnType<typeof setInterval> | undefined;
let frame = 0;

function cycle() {
  clearInterval(timer);
  if (editing || reduced.value || changing.value.length < 2) return;
  timer = setInterval(() => (index.value = (index.value + 1) % changing.value.length), 2600);
}

/** The light that follows the mouse: two CSS variables, updated at most once per frame. */
function onPointer(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const r = root.value?.getBoundingClientRect();
    if (!r) return;
    root.value!.style.setProperty('--mx', `${e.clientX - r.left}px`);
    root.value!.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}

watch([reduced, () => changing.value.length], cycle);
onMounted(cycle);
onBeforeUnmount(() => {
  clearInterval(timer);
  cancelAnimationFrame(frame);
});
</script>

<template>
  <section
    ref="root"
    class="relative isolate flex min-h-[92dvh] items-center overflow-hidden px-6 py-28 @3xl:px-16"
    :class="dark ? 'bg-[#07070c] text-white' : 'bg-surface text-ink'"
    :style="{ '--shimmer-mid': p.color || '#7c5cff' }"
    @pointermove="onPointer"
  >
    <!-- Drifting glows -->
    <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div
        class="motion-safe-only absolute -left-[10%] -top-[20%] h-[60vmax] w-[60vmax] rounded-full opacity-60 blur-[90px]"
        :class="{ 'mix-blend-screen': dark }"
        style="background: radial-gradient(circle, var(--c-primary), transparent 65%); animation: aurora-a 22s ease-in-out infinite"
      />
      <div
        class="motion-safe-only absolute -right-[15%] top-[10%] h-[55vmax] w-[55vmax] rounded-full opacity-50 blur-[100px]"
        :class="{ 'mix-blend-screen': dark }"
        :style="{ background: `radial-gradient(circle, ${p.color || '#7c5cff'}, transparent 65%)`, animation: 'aurora-b 26s ease-in-out infinite' }"
      />
      <div
        class="motion-safe-only absolute -bottom-[30%] left-[25%] h-[50vmax] w-[50vmax] rounded-full opacity-50 blur-[90px]"
        :class="{ 'mix-blend-screen': dark }"
        style="background: radial-gradient(circle, var(--c-secondary), transparent 65%); animation: aurora-c 30s ease-in-out infinite"
      />
      <!-- Fine grid, fading out toward the edges -->
      <div
        class="absolute inset-0"
        :class="dark ? 'opacity-[0.12]' : 'opacity-[0.07]'"
        style="
          background-image: linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
        "
      />
      <!-- Mouse light -->
      <div
        class="absolute inset-0 transition-opacity duration-500"
        style="background: radial-gradient(500px circle at var(--mx, 50%) var(--my, 40%), rgb(255 255 255 / 0.1), transparent 60%)"
      />
    </div>

    <div class="mx-auto w-full max-w-5xl text-center">
      <p
        v-if="p.eyebrow || editing"
        class="mx-auto mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide @3xl:text-sm"
        :class="dark ? 'glass text-white' : 'bg-white/70 shadow-sm ring-1 ring-black/5'"
        style="animation: word-rise 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both"
      >
        <span class="relative flex h-2 w-2">
          <span class="motion-safe-only absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span class="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
      </p>

      <h1 class="text-5xl font-black leading-[1.05] tracking-tight @3xl:text-7xl @5xl:text-8xl">
        <EditableText v-if="editing" :value="p.title" path="title" />
        <template v-else>
          <template v-for="(w, i) in titleWords" :key="i">
            <span class="inline-block" :style="{ animation: `word-rise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) ${150 + i * 110}ms both` }">{{ w }}</span>{{ ' ' }}
          </template>
        </template>
        <span v-if="changing.length" class="relative inline-block">
          <!-- type="transition": the word's endless shimmer animation must not hold up the swap. -->
          <Transition
            type="transition"
            mode="out-in"
            enter-active-class="transition duration-500 ease-out"
            enter-from-class="translate-y-[0.5em] opacity-0 blur-sm"
            leave-active-class="transition duration-300 ease-in"
            leave-to-class="-translate-y-[0.5em] opacity-0 blur-sm"
          >
            <span
              :key="word"
              class="text-shimmer inline-block pb-[0.1em]"
              :style="{ animationDelay: `${150 + titleWords.length * 110}ms` }"
            >{{ word }}</span>
          </Transition>
        </span>
      </h1>
      <p v-if="editing" class="mt-3 text-xs opacity-70" dir="ltr">
        Changing words: <EditableText :value="p.words" path="words" />
      </p>

      <p
        v-if="p.text || editing"
        class="mx-auto mt-8 max-w-2xl text-lg font-extralight leading-relaxed opacity-80 @3xl:text-xl"
        :style="{ animation: `word-rise 0.9s ease-out ${300 + titleWords.length * 110}ms both` }"
      >
        <EditableText :value="p.text" path="text" multiline />
      </p>

      <div class="mt-10 flex flex-wrap items-center justify-center gap-3" :style="{ animation: `word-rise 0.9s ease-out ${450 + titleWords.length * 110}ms both` }">
        <a
          v-if="p.buttonLabel"
          :href="editing ? undefined : resolveHref(p.buttonLink, locale)"
          class="group relative inline-flex items-center gap-2 overflow-hidden rounded-[var(--radius-button)] bg-primary px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_var(--c-primary)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-10px_var(--c-primary)]"
        >
          <!-- A shine sweeping across on hover -->
          <span class="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/30 transition-all duration-700 group-hover:left-[120%]" aria-hidden="true" />
          <EditableText :value="p.buttonLabel" path="buttonLabel" />
          <i class="mdi mdi-arrow-right transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
        </a>
        <a
          v-if="p.secondButtonLabel"
          :href="editing ? undefined : resolveHref(p.secondButtonLink, locale)"
          class="inline-flex items-center gap-2 rounded-[var(--radius-button)] px-7 py-3.5 text-sm font-semibold ring-1 transition hover:-translate-y-0.5"
          :class="dark ? 'ring-white/25 hover:bg-white/10' : 'ring-black/15 hover:bg-black/5'"
        >
          <EditableText :value="p.secondButtonLabel" path="secondButtonLabel" />
        </a>
      </div>
    </div>

    <!-- Scroll cue -->
    <div class="pointer-events-none absolute bottom-6 left-1/2 flex h-10 w-6 -translate-x-1/2 justify-center rounded-full border-2 border-current opacity-40" aria-hidden="true">
      <span class="motion-safe-only mt-1.5 h-2 w-1 animate-bounce rounded-full bg-current" />
    </div>
  </section>
</template>
