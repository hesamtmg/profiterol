<script setup lang="ts">
/**
 * A title stretched across the page, then project cards scattered in two columns, the second one half a card lower,
 * so they zigzag down the page. A thick line in the second color winds behind them and draws itself as the visitor
 * scrolls. Phones get one column; the editor and visitors who turn off motion get the line fully drawn.
 */
import EditableText from '../../site/EditableText.vue';

interface Project {
  image: string;
  category: string;
  title: string;
  link: string;
}

const props = defineProps<{ p: { title: string; projects: Project[]; line: boolean }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const grid = ref<HTMLElement | null>(null);
const progress = useScrollProgress(grid, (rect, vh) => (vh * 0.8 - rect.top) / rect.height, 0);
const drawn = computed(() => (editing || reduced.value ? 1 : progress.value));

/** Long titles get smaller so the title still fits on one line. */
const titleSize = computed(() => `${Math.min(13, 150 / Math.max(1, Array.from(props.p.title).length))}cqw`);

// The line is drawn in pixels of the grid, so its thickness never stretches.
const size = reactive({ w: 0, h: 0 });
let observer: ResizeObserver | undefined;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => Object.assign(size, { w: entry.contentRect.width, h: entry.contentRect.height }));
  if (grid.value) observer.observe(grid.value);
});
onBeforeUnmount(() => observer?.disconnect());

/** A winding line: from the start side, a loop round every card, swinging from one side to the other. */
const path = computed(() => {
  const { w, h } = size;
  const n = Math.max(1, props.p.projects.length);
  if (!w || !h) return '';
  let d = `M ${-0.05 * w} ${0.02 * h}`;
  for (let i = 0; i < n; i++) {
    const y = ((i + 0.5) / n) * h;
    const side = i % 2 === 0 ? 0.32 : 0.72;
    const r = Math.min(w * 0.17, (h / n) * 0.45);
    const cx = side * w;
    d += ` C ${cx - r * 2} ${y - r * 1.6}, ${cx - r * 1.4} ${y - r * 1.4}, ${cx} ${y - r}`;
    d += ` C ${cx + r * 1.4} ${y - r}, ${cx + r * 1.2} ${y + r}, ${cx} ${y + r}`;
    d += ` C ${cx - r * 1.2} ${y + r}, ${cx - r * 0.6} ${y}, ${cx + r * 0.3} ${y - r * 0.2}`;
  }
  return `${d} L ${1.05 * w} ${h}`;
});

/** Each card is a little off its column's edge, alternating, so the grid looks scattered. */
const shift = ['@3xl:ms-[10%]', '@3xl:ms-[30%]', '@3xl:ms-[22%]', '@3xl:ms-[14%]'];
</script>

<template>
  <section class="relative overflow-hidden px-4 py-16 text-ink @3xl:px-10 @3xl:py-28">
    <h2
      v-if="p.title || editing"
      class="mb-12 whitespace-nowrap text-center font-medium uppercase leading-none tracking-tight @3xl:mb-24"
      :style="{ fontSize: titleSize }"
    >
      <EditableText :value="p.title" path="title" placeholder="Title" />
    </h2>

    <div ref="grid" class="relative grid gap-y-14 @3xl:grid-cols-2 @3xl:gap-x-10 @3xl:gap-y-0">
      <svg
        v-if="p.line && path"
        class="pointer-events-none absolute inset-0 h-full w-full text-secondary"
        :viewBox="`0 0 ${size.w} ${size.h}`"
        fill="none"
        aria-hidden="true"
      >
        <path
          :d="path"
          stroke="currentColor"
          stroke-width="28"
          stroke-linecap="round"
          stroke-linejoin="round"
          pathLength="1"
          :style="{ strokeDasharray: 1, strokeDashoffset: 1 - drawn, opacity: 0.8 }"
        />
      </svg>

      <component
        :is="project.link && !editing ? 'a' : 'div'"
        v-for="(project, i) in p.projects"
        :key="i"
        v-reveal="{ delay: (i % 2) * 120 }"
        :href="project.link && !editing ? resolveHref(project.link, locale) : undefined"
        class="group relative z-10 block w-full @3xl:w-[60%] @3xl:pb-[9cqw] @3xl:[grid-column:var(--col)] @3xl:[grid-row:var(--row)/span_2]"
        :class="shift[i % shift.length]"
        :style="{ '--col': (i % 2) + 1, '--row': i + 1 }"
      >
        <div class="aspect-[38/44] overflow-hidden rounded-2xl bg-dark">
          <img
            v-if="project.image"
            :src="project.image"
            :alt="project.title"
            class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div v-else class="photo-placeholder h-full w-full transition-transform duration-700 group-hover:scale-105" />
        </div>
        <p v-if="project.category || editing" class="mt-4 text-xs font-medium text-muted @3xl:text-sm">
          <EditableText :value="project.category" :path="`projects.${i}.category`" placeholder="Category" />
        </p>
        <h3 class="mt-1 text-2xl font-medium tracking-tight @3xl:text-4xl">
          <EditableText :value="project.title" :path="`projects.${i}.title`" placeholder="Name" />
        </h3>
      </component>
    </div>
  </section>
</template>
