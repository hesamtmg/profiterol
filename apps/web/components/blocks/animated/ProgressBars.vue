<script setup lang="ts">
/**
 * Bars that fill up one after another, with their percentage counting along, when they come into view. The page
 * is served with the bars full (for search engines and visitors without JavaScript); they empty and fill only
 * once the block is seen. Full and still in the editor and for visitors who turn off motion.
 */
import EditableText from '../../site/EditableText.vue';

interface Item {
  label: string;
  value: number;
}

const props = defineProps<{ p: { title: string; text: string; items: Item[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const root = ref<HTMLElement | null>(null);
/** Milliseconds since the bars started filling; Infinity once done (or never animated). */
const elapsed = ref(Infinity);
const FILL_MS = 1600;
const STAGGER_MS = 150;
let frame = 0;
let observer: IntersectionObserver | undefined;

const format = computed(() => new Intl.NumberFormat(props.locale === 'fa' ? 'fa-IR' : 'en-US'));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const percent = (item: Item) => Math.min(100, Math.max(0, Number(item.value) || 0));

/** How full bar `i` is right now, 0–1 of its own value. */
function filled(i: number) {
  return easeOutCubic(Math.min(1, Math.max(0, (elapsed.value - i * STAGGER_MS) / FILL_MS)));
}

function run() {
  const startAt = performance.now();
  const total = FILL_MS + STAGGER_MS * Math.max((props.p.items?.length ?? 1) - 1, 0);
  const tick = (now: number) => {
    elapsed.value = now - startAt;
    if (elapsed.value < total) frame = requestAnimationFrame(tick);
    else elapsed.value = Infinity;
  };
  frame = requestAnimationFrame(tick);
}

onMounted(() => {
  if (editing || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !root.value) return;
  elapsed.value = 0;
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry!.isIntersecting) return;
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
    <div class="mx-auto grid max-w-6xl gap-12 @3xl:grid-cols-[2fr_3fr] @3xl:gap-20">
      <div>
        <h2 v-if="p.title || editing" class="text-3xl font-black leading-tight @3xl:text-5xl">
          <EditableText :value="p.title" path="title" placeholder="Title" />
        </h2>
        <p v-if="p.text || editing" class="mt-5 text-lg font-light text-muted">
          <EditableText :value="p.text" path="text" multiline />
        </p>
      </div>
      <ul class="space-y-8">
        <li v-for="(item, i) in p.items" :key="i">
          <div class="mb-3 flex items-baseline justify-between gap-4">
            <span class="font-semibold"><EditableText :value="item.label" :path="`items.${i}.label`" placeholder="Label" /></span>
            <span class="text-sm font-bold tabular-nums text-primary" dir="ltr">
              {{ format.format(Math.round(percent(item) * filled(i))) }}%
            </span>
          </div>
          <div
            class="h-2.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            :aria-label="item.label"
            :aria-valuenow="percent(item)"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="h-full origin-left rounded-full bg-gradient-to-r from-primary to-secondary rtl:origin-right"
              :style="{ width: `${percent(item)}%`, transform: `scaleX(${filled(i)})` }"
            />
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
