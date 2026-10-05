<script setup lang="ts">
/**
 * Numbers that count up when they come into view. The page is served with the real numbers (for search
 * engines and visitors without JavaScript); they drop to zero and count up only once the block is seen.
 */
import EditableText from '../../site/EditableText.vue';

interface Item {
  value: number;
  prefix: string;
  suffix: string;
  label: string;
}

const props = defineProps<{ p: { title: string; items: Item[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const root = ref<HTMLElement | null>(null);
/** 0 → 1 while counting; numbers show value × eased progress. */
const progress = ref(1);
let frame = 0;
let observer: IntersectionObserver | undefined;

const format = computed(() => new Intl.NumberFormat(props.locale === 'fa' ? 'fa-IR' : 'en-US'));
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

const fewColumns: Record<number, string> = { 1: '@3xl:grid-cols-1', 2: '@3xl:grid-cols-2', 3: '@3xl:grid-cols-3' };
const columns = computed(() => fewColumns[props.p.items?.length ?? 0] ?? '@3xl:grid-cols-4');

function decimals(v: number) {
  return String(v).split('.')[1]?.length ?? 0;
}

function shown(item: Item) {
  const v = Number(item.value) || 0;
  const d = decimals(v);
  const n = v * easeOutExpo(progress.value);
  return format.value.format(Number(n.toFixed(d)));
}

function run() {
  const startAt = performance.now();
  const tick = (now: number) => {
    progress.value = Math.min(1, (now - startAt) / 2200);
    if (progress.value < 1) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}

onMounted(() => {
  if (editing || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !root.value) return;
  progress.value = 0;
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      observer?.disconnect();
      run();
    },
    { threshold: 0.3 },
  );
  observer.observe(root.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  cancelAnimationFrame(frame);
});
</script>

<template>
  <section ref="root" class="bg-surface px-6 py-20 text-ink @3xl:px-16 @3xl:py-28">
    <div class="mx-auto max-w-6xl">
      <h2 v-if="p.title || editing" class="mb-12 text-center text-2xl font-black @3xl:text-4xl">
        <EditableText :value="p.title" path="title" placeholder="Title" />
      </h2>
      <div class="grid grid-cols-2 gap-y-12" :class="columns">
        <div
          v-for="(item, i) in p.items"
          :key="i"
          class="relative px-4 text-center"
          :class="{ '@3xl:border-s @3xl:border-slate-200': i > 0 }"
        >
          <p class="text-shimmer text-5xl font-black tabular-nums tracking-tight @3xl:text-7xl" dir="ltr">
            {{ item.prefix }}{{ shown(item) }}{{ item.suffix }}
          </p>
          <p class="mt-3 text-sm font-light text-muted @3xl:text-base">
            <EditableText :value="item.label" :path="`items.${i}.label`" />
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
