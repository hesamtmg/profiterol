<script setup lang="ts">
/**
 * A gray panel listing project names with their category and year. Pointing at a row nudges its name and shows the
 * project's picture beside the mouse; the other rows fade a little. A zigzag in the second color draws itself
 * behind the list as it scrolls into view. Touch screens, the editor and reduced motion skip the floating picture.
 */
import EditableText from '../../site/EditableText.vue';

interface Item {
  title: string;
  category: string;
  year: string;
  image: string;
  link: string;
}

const props = defineProps<{ p: { items: Item[]; buttonLabel: string; buttonLink: string; line: boolean }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const root = ref<HTMLElement | null>(null);
const progress = useScrollProgress(root, (rect, vh) => (vh - rect.top) / (rect.height + vh * 0.3), 0);
const drawn = computed(() => (editing || reduced.value ? 1 : progress.value));

const active = ref<number | null>(null);
const pos = reactive({ x: 0, y: 0 });
function onMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || !root.value) return;
  const r = root.value.getBoundingClientRect();
  Object.assign(pos, { x: e.clientX - r.left, y: e.clientY - r.top });
}
function enter(i: number, e: PointerEvent) {
  if (e.pointerType !== 'mouse' || editing || reduced.value) return;
  onMove(e);
  active.value = i;
}
const hasImages = computed(() => props.p.items.some((item) => item.image));
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div
      ref="root"
      class="relative overflow-hidden rounded-[2rem] bg-surface px-6 py-10 text-ink @3xl:rounded-card @3xl:px-10 @3xl:py-14"
      @pointermove="onMove"
    >
      <svg
        v-if="p.line"
        class="pointer-events-none absolute end-0 top-0 h-full w-[60%] text-secondary"
        viewBox="0 0 700 560"
        preserveAspectRatio="xMaxYMid meet"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M720 25 L120 45 C40 50 40 85 120 100 L320 140 C380 155 380 180 320 195 L90 245 C20 265 20 290 90 305 L320 355 C380 370 380 395 320 410 L60 485"
          stroke="currentColor"
          stroke-width="32"
          stroke-linecap="round"
          stroke-linejoin="round"
          pathLength="1"
          :style="{ strokeDasharray: 1, strokeDashoffset: 1 - drawn, opacity: 0.85 }"
        />
      </svg>

      <ul class="relative" @pointerleave="active = null">
        <li v-for="(item, i) in p.items" :key="i">
          <component
            :is="item.link && !editing ? 'a' : 'div'"
            :href="item.link && !editing ? resolveHref(item.link, locale) : undefined"
            class="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 transition-opacity duration-300 @3xl:py-4"
            :class="active !== null && active !== i ? 'opacity-40' : ''"
            @pointerenter="enter(i, $event)"
          >
            <span
              class="text-2xl font-medium tracking-tight transition-[padding] duration-500 @3xl:text-4xl"
              :class="editing ? '' : 'group-hover:ps-4'"
            >
              <EditableText :value="item.title" :path="`items.${i}.title`" placeholder="Name" />
            </span>
            <span class="flex items-center gap-3 text-sm @3xl:text-lg">
              <EditableText :value="item.category" :path="`items.${i}.category`" placeholder="Category" />
              <span class="h-1.5 w-1.5 rounded-full bg-[color-mix(in_srgb,var(--c-text)_35%,transparent)]" aria-hidden="true" />
              <span class="tabular-nums"><EditableText :value="item.year" :path="`items.${i}.year`" placeholder="Year" /></span>
            </span>
          </component>
        </li>
      </ul>

      <a
        v-if="p.buttonLabel || editing"
        :href="editing ? undefined : resolveHref(p.buttonLink, locale)"
        class="relative mt-10 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] hover:text-primary"
      >
        <EditableText :value="p.buttonLabel" path="buttonLabel" placeholder="View all" />
        <i class="mdi mdi-arrow-top-right rtl:-scale-x-100" aria-hidden="true" />
      </a>

      <!-- The picture beside the mouse -->
      <div
        v-if="hasImages && !editing"
        class="pointer-events-none absolute left-0 top-0 z-10 w-56 @3xl:w-72"
        :style="{ transform: `translate(${pos.x + 24}px, ${pos.y}px) translateY(-50%)` }"
        aria-hidden="true"
      >
        <div
          class="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl transition duration-300"
          :class="active !== null && p.items[active]?.image ? 'scale-100 opacity-100' : 'scale-75 opacity-0'"
        >
          <template v-for="(item, i) in p.items" :key="i">
            <img
              v-if="item.image"
              :src="item.image"
              alt=""
              class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
              :class="active === i ? 'opacity-100' : 'opacity-0'"
              loading="lazy"
            />
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
