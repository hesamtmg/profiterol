<script setup lang="ts">
/**
 * The mikewilcockdesign.com work list: numbered projects in big type down one side, each with its year, kind of
 * work and a link, divided by hairlines. The row nearest the middle of the screen is lit (or the one pointed at);
 * beside the list a panel stays on screen with that project's picture, a counter, its tag and a progress line.
 * On phones each row shows its own picture instead.
 */
import EditableText from '../../site/EditableText.vue';
import { folioColors, folioLabel } from './look';

interface Project {
  title: string;
  year: string;
  kind: string;
  note: string;
  tag: string;
  image: string;
  color: string;
  link: string;
}

const props = defineProps<{
  p: { label: string; period: string; projects: Project[]; linkLabel: string; look: string };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const colors = computed(() => folioColors(props.p.look));
const count = computed(() => props.p.projects.length);
const two = (n: number) => String(n).padStart(2, '0');

const rows = ref<HTMLElement[]>([]);
const scrolled = ref(0);
const pointed = ref<number | null>(null);

// The row whose middle is closest to the middle of the screen.
useScrollFrame(() => {
  const mid = window.innerHeight / 2;
  let best = 0;
  let bestGap = Infinity;
  rows.value.forEach((row, i) => {
    const r = row.getBoundingClientRect();
    const gap = Math.abs(r.top + r.height / 2 - mid);
    if (gap < bestGap) [best, bestGap] = [i, gap];
  });
  scrolled.value = best;
});
const active = computed(() => Math.min(pointed.value ?? scrolled.value, Math.max(0, count.value - 1)));

function fill(color: string) {
  return /^#[0-9a-f]{3,8}$/i.test(color ?? '') ? color : 'var(--c-primary)';
}
</script>

<template>
  <section class="px-5 py-20 @3xl:px-14 @3xl:py-28" :class="colors.panel">
    <div class="mb-8 flex items-center justify-between gap-4 opacity-60 @3xl:mb-10" :class="folioLabel">
      <span>
        <EditableText :value="p.label" path="label" placeholder="Label" /> <span class="tabular-nums">({{ two(count) }})</span>
      </span>
      <span class="tabular-nums"><EditableText :value="p.period" path="period" placeholder="Years" /></span>
    </div>

    <div class="grid gap-14 @4xl:grid-cols-[1.6fr_1fr]">
      <ol class="border-t" :class="colors.line" @pointerleave="pointed = null">
        <li
          v-for="(project, i) in p.projects"
          :key="i"
          ref="rows"
          class="border-b py-10 transition-opacity duration-500 @3xl:py-16"
          :class="[colors.line, editing || reduced || i === active ? '' : 'opacity-40']"
          @pointerenter="(e) => (e.pointerType === 'mouse' ? (pointed = i) : null)"
        >
          <div class="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 @3xl:grid-cols-[4.75rem_1fr_auto]">
            <span class="font-mono text-xs tabular-nums" :class="i === active ? 'text-primary' : ''">{{ two(i + 1) }}</span>
            <h3 class="text-4xl font-medium leading-[1.05] tracking-tight @3xl:text-7xl">
              <EditableText :value="project.title" :path="`projects.${i}.title`" placeholder="Name" />
            </h3>
            <span class="font-mono text-xs tabular-nums opacity-70">
              <EditableText :value="project.year" :path="`projects.${i}.year`" placeholder="Year" />
            </span>
          </div>
          <div class="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 ps-[calc(2.5rem+1rem)] @3xl:ps-[calc(4.75rem+1rem)]">
            <span class="flex flex-wrap gap-x-5 gap-y-1" :class="folioLabel">
              <span class="opacity-60"><EditableText :value="project.kind" :path="`projects.${i}.kind`" placeholder="Kind of work" /></span>
              <span v-if="project.note || editing" class="text-primary">
                <EditableText :value="project.note" :path="`projects.${i}.note`" placeholder="(Note)" />
              </span>
            </span>
            <a
              v-if="(project.link || editing) && p.linkLabel"
              :href="editing ? undefined : resolveHref(project.link, locale)"
              class="transition-colors hover:text-primary"
              :class="folioLabel"
            >
              <EditableText v-if="i === 0" :value="p.linkLabel" path="linkLabel" placeholder="View project →" />
              <template v-else>{{ p.linkLabel }}</template>
            </a>
          </div>
          <!-- Phones: the picture under each project -->
          <div
            class="mt-6 aspect-[4/3] overflow-hidden rounded-sm @4xl:hidden"
            :style="{ background: fill(project.color) }"
            aria-hidden="true"
          >
            <img v-if="project.image" :src="project.image" alt="" class="h-full w-full object-cover" loading="lazy" />
          </div>
        </li>
      </ol>

      <!-- The preview that stays on screen -->
      <div class="hidden @4xl:block">
        <div class="sticky top-[12vh]">
          <div class="relative aspect-[4/5] overflow-hidden rounded-sm">
            <div
              v-for="(project, i) in p.projects"
              :key="i"
              class="absolute inset-0 transition-[opacity,transform] duration-700 ease-out"
              :class="i === active ? 'scale-100 opacity-100' : 'scale-[1.04] opacity-0'"
              :style="{ background: fill(project.color) }"
            >
              <img v-if="project.image" :src="project.image" :alt="project.title" class="h-full w-full object-cover" loading="lazy" />
              <span
                v-else
                class="absolute inset-0 flex items-center justify-center p-8 text-center text-4xl font-bold tracking-tight text-white opacity-60 mix-blend-difference"
                aria-hidden="true"
                >{{ project.title }}</span
              >
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between" :class="folioLabel">
            <span class="tabular-nums">
              (<span class="text-primary">{{ two(active + 1) }}</span> <span class="opacity-60">/ {{ two(count) }})</span>
            </span>
            <span class="opacity-60">{{ p.projects[active]?.tag }}</span>
          </div>
          <div class="mt-4 h-px bg-[color-mix(in_srgb,currentColor_15%,transparent)]">
            <div
              class="h-full origin-[left] bg-primary transition-transform duration-700 rtl:origin-[right]"
              :style="{ transform: `scaleX(${count ? (active + 1) / count : 0})` }"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
