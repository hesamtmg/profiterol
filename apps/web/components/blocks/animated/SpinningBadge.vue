<script setup lang="ts">
/**
 * Words running around a circle that turns slowly on its own and speeds up while the visitor scrolls
 * (backwards when they scroll back up), next to a title. It only turns while on screen; in the editor and for
 * visitors who turn off motion it stands still.
 */
import EditableText from '../../site/EditableText.vue';

const props = defineProps<{
  p: {
    eyebrow: string;
    title: string;
    text: string;
    buttonLabel: string;
    buttonLink: string;
    badgeText: string;
    image: string;
    icon: string;
    badgeSide: string;
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const root = ref<HTMLElement | null>(null);
const ring = ref<SVGElement | null>(null);
const pathId = `badge-${useId()}`;

/** The circle the words run along: radius 80 in a 200 × 200 box. */
const CIRCUMFERENCE = 2 * Math.PI * 80;
/** The words, repeated until there are about forty letters, then spaced evenly round the whole circle. */
const ringText = computed(() => {
  const words = String(props.p.badgeText ?? '').trim();
  if (!words) return '';
  return Array.from({ length: Math.max(1, Math.round(40 / words.length)) }, () => words).join(' ') + ' ';
});
const icon = computed(() => (/^mdi-[a-z0-9-]+$/.test(props.p.icon ?? '') ? props.p.icon : 'mdi-star-four-points'));

/** Degrees per second on its own. */
const BASE = 14;
let angle = 0;
let kick = 0;
let lastTop: number | null = null;
let last = 0;
let frame = 0;
let observer: IntersectionObserver | undefined;

function spin(now: number) {
  const dt = Math.min((now - (last || now)) / 1000, 0.1);
  last = now;
  angle = (angle + (BASE + kick) * dt) % 360;
  kick *= Math.pow(0.04, dt); // Most of a scroll's push is gone after a second.
  if (ring.value) ring.value.style.transform = `rotate(${angle}deg)`;
  frame = requestAnimationFrame(spin);
}

function stop() {
  cancelAnimationFrame(frame);
  frame = 0;
  last = 0;
}

useScrollFrame(() => {
  if (!root.value || !frame) return;
  const top = root.value.getBoundingClientRect().top;
  if (lastTop !== null) kick = Math.max(-720, Math.min(720, kick + (lastTop - top) * 2.5));
  lastTop = top;
});

onMounted(() => {
  if (editing || !root.value) return;
  observer = new IntersectionObserver(([entry]) => {
    stop();
    lastTop = null;
    if (entry!.isIntersecting && !reduced.value) frame = requestAnimationFrame(spin);
  });
  observer.observe(root.value);
});
watch(reduced, (r) => r && stop());
onBeforeUnmount(() => {
  observer?.disconnect();
  stop();
});
</script>

<template>
  <section ref="root" class="overflow-hidden bg-surface px-6 py-20 text-ink @3xl:px-16 @3xl:py-28">
    <div
      class="mx-auto flex max-w-6xl flex-col items-center gap-12 @3xl:flex-row @3xl:gap-20"
      :class="p.badgeSide === 'start' ? '@3xl:flex-row-reverse' : ''"
    >
      <div class="flex-1 text-center @3xl:text-start">
        <p v-if="p.eyebrow || editing" class="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
          <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
        </p>
        <h2 class="text-4xl font-black leading-tight tracking-tight @3xl:text-6xl">
          <EditableText :value="p.title" path="title" placeholder="Title" />
        </h2>
        <p v-if="p.text || editing" class="mt-5 max-w-xl text-lg font-light text-muted @3xl:mx-0">
          <EditableText :value="p.text" path="text" multiline />
        </p>
        <a
          v-if="p.buttonLabel"
          :href="editing ? undefined : resolveHref(p.buttonLink, locale)"
          class="mt-8 inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
        >
          <EditableText :value="p.buttonLabel" path="buttonLabel" />
          <i class="mdi mdi-arrow-right rtl:rotate-180" />
        </a>
        <p v-if="editing" class="mt-6 text-xs text-muted">
          <EditableText :value="p.badgeText" path="badgeText" placeholder="Words around the circle" />
        </p>
      </div>

      <div class="relative aspect-square w-60 shrink-0 @3xl:w-80">
        <svg ref="ring" viewBox="0 0 200 200" class="absolute inset-0 h-full w-full will-change-transform" aria-hidden="true">
          <defs>
            <path :id="pathId" d="M 100,100 m -80,0 a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0" />
          </defs>
          <!-- A left-to-right base keeps right-to-left words on the circle; they still read right to left. -->
          <text class="fill-current text-[15px] font-bold uppercase" direction="ltr">
            <textPath :href="`#${pathId}`" :textLength="CIRCUMFERENCE - 4" lengthAdjust="spacing">{{ ringText }}</textPath>
          </text>
        </svg>
        <div class="absolute inset-[24%] overflow-hidden rounded-full bg-primary text-white shadow-xl">
          <img v-if="p.image" :src="p.image" alt="" class="h-full w-full object-cover" loading="lazy" />
          <span v-else class="flex h-full w-full items-center justify-center text-5xl @3xl:text-6xl">
            <i class="mdi" :class="icon" aria-hidden="true" />
          </span>
        </div>
        <span class="sr-only">{{ p.badgeText }}</span>
      </div>
    </div>
  </section>
</template>
