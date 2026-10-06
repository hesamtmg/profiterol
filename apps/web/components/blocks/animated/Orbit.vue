<script setup lang="ts">
/**
 * Logos or icons circling a title on two rings that turn opposite ways, each icon turning back against its ring
 * so it stays upright. Pure CSS: pointing at the rings pauses them, and in the editor and for visitors who turn
 * off motion they stand still.
 */
import EditableText from '../../site/EditableText.vue';

interface Item {
  image: string;
  icon: string;
  name: string;
}

const props = defineProps<{
  p: { eyebrow: string; title: string; text: string; buttonLabel: string; buttonLink: string; items: Item[]; seconds: number };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());

/** The inner ring takes up to five, the outer the rest. */
const rings = computed(() => {
  const items = props.p.items ?? [];
  const inner = Math.min(5, Math.ceil(items.length * 0.4));
  return [
    { items: items.slice(0, inner), inset: '22%', reverse: false, speed: 1 },
    { items: items.slice(inner), inset: '3%', reverse: true, speed: 1.4 },
  ].filter((r) => r.items.length);
});
const seconds = computed(() => Math.max(Number(props.p.seconds) || 40, 5));

/** Where an icon sits on its ring: evenly spaced, starting at the top. */
function place(i: number, count: number) {
  const a = (i / count) * Math.PI * 2 - Math.PI / 2;
  return { left: `${50 + 50 * Math.cos(a)}%`, top: `${50 + 50 * Math.sin(a)}%` };
}
const iconClass = (item: Item) => (/^mdi-[a-z0-9-]+$/.test(item.icon ?? '') ? item.icon : 'mdi-puzzle-outline');
</script>

<template>
  <section class="overflow-hidden bg-surface px-4 py-20 text-ink @3xl:py-28">
    <div class="orbit relative mx-auto aspect-square w-full max-w-[44rem]" :class="{ 'orbit-still': editing }">
      <ul class="contents">
        <template v-for="(ring, r) in rings" :key="r">
          <li
            class="orbit-ring absolute rounded-full border border-dashed border-slate-300"
            :class="{ 'orbit-reverse': ring.reverse }"
            :style="{ inset: ring.inset, animationDuration: `${seconds * ring.speed}s` }"
          >
            <span
              v-for="(item, i) in ring.items"
              :key="i"
              class="absolute -translate-x-1/2 -translate-y-1/2"
              :style="place(i, ring.items.length)"
            >
              <span
                class="orbit-ring orbit-counter flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white text-2xl text-primary shadow-lg ring-1 ring-black/5 @3xl:h-16 @3xl:w-16 @3xl:text-3xl"
                :class="{ 'orbit-reverse': ring.reverse }"
                :style="{ animationDuration: `${seconds * ring.speed}s` }"
                :title="item.name"
              >
                <img v-if="item.image" :src="item.image" :alt="item.name" class="h-full w-full object-contain p-2" loading="lazy" />
                <template v-else>
                  <i class="mdi" :class="iconClass(item)" aria-hidden="true" />
                  <span class="sr-only">{{ item.name }}</span>
                </template>
              </span>
            </span>
          </li>
        </template>
      </ul>

      <div class="absolute inset-[30%] flex flex-col items-center justify-center text-center">
        <p v-if="p.eyebrow || editing" class="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary @3xl:text-sm">
          <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
        </p>
        <h2 class="text-xl font-black leading-tight tracking-tight @xl:text-3xl @3xl:text-4xl">
          <EditableText :value="p.title" path="title" placeholder="Title" />
        </h2>
      </div>
    </div>

    <div class="mx-auto max-w-xl text-center">
      <p v-if="p.text || editing" class="text-lg font-light text-muted">
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
    </div>
  </section>
</template>

<style scoped>
.orbit-ring {
  animation: orbit-spin linear infinite;
}
.orbit-counter {
  animation-direction: reverse;
}
.orbit-reverse {
  animation-direction: reverse;
}
.orbit-counter.orbit-reverse {
  animation-direction: normal;
}
.orbit:hover .orbit-ring,
.orbit-still .orbit-ring {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .orbit-ring {
    animation: none;
  }
}
@keyframes orbit-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
