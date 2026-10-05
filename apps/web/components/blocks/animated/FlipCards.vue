<script setup lang="ts">
/**
 * Cards that turn over on hover (or tap on touch screens, or keyboard focus) to show more on the back.
 * In the editor a card also stays turned while you type on its back.
 */
import EditableText from '../../site/EditableText.vue';

interface Item {
  image: string;
  title: string;
  back: string;
  buttonLabel: string;
  buttonLink: string;
}

defineProps<{ p: { title: string; items: Item[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const flipped = ref<Set<number>>(new Set());

function toggle(i: number, e: Event) {
  if ((e.target as HTMLElement).closest('a, [contenteditable]')) return;
  const next = new Set(flipped.value);
  if (next.has(i)) next.delete(i);
  else next.add(i);
  flipped.value = next;
}
</script>

<template>
  <section class="bg-surface px-6 py-20 text-ink @3xl:px-16 @3xl:py-28">
    <div class="mx-auto max-w-6xl">
      <h2 v-if="p.title || editing" class="mb-12 text-center text-3xl font-black @3xl:text-5xl"><EditableText :value="p.title" path="title" placeholder="Title" /></h2>
      <div class="grid gap-6 @2xl:grid-cols-2 @4xl:grid-cols-3">
        <div
          v-for="(item, i) in p.items"
          :key="i"
          class="flip group aspect-[3/4] cursor-pointer [perspective:1400px]"
          :class="{ flipped: flipped.has(i) }"
          tabindex="0"
          role="button"
          :aria-pressed="flipped.has(i)"
          :aria-label="item.title"
          @click="toggle(i, $event)"
          @keydown.enter.prevent="toggle(i, $event)"
        >
          <div class="flip-inner relative h-full w-full rounded-[2rem] shadow-xl transition-transform duration-700 [transform-style:preserve-3d]">
            <!-- Front -->
            <div class="absolute inset-0 overflow-hidden rounded-[2rem] [backface-visibility:hidden]">
              <img v-if="item.image" :src="item.image" :alt="item.title" loading="lazy" class="h-full w-full object-cover" />
              <div v-else class="photo-placeholder h-full w-full" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-6 text-white">
                <h3 class="text-2xl font-bold"><EditableText :value="item.title" :path="`items.${i}.title`" /></h3>
                <span class="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full" aria-hidden="true"><i class="mdi mdi-rotate-3d-variant" /></span>
              </div>
            </div>
            <!-- Back -->
            <div
              class="absolute inset-0 flex flex-col justify-center gap-6 overflow-hidden rounded-[2rem] bg-primary p-8 text-white [backface-visibility:hidden] [transform:rotateY(180deg)]"
            >
              <div class="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
              <p class="relative text-xl font-light leading-relaxed"><EditableText :value="item.back" :path="`items.${i}.back`" multiline /></p>
              <a
                v-if="item.buttonLabel"
                :href="editing ? undefined : resolveHref(item.buttonLink, locale)"
                class="relative inline-flex w-fit items-center gap-2 rounded-[var(--radius-button)] bg-white px-5 py-2.5 text-sm font-semibold text-dark transition hover:scale-105"
              >
                <EditableText :value="item.buttonLabel" :path="`items.${i}.buttonLabel`" />
                <i class="mdi mdi-arrow-right rtl:rotate-180" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
@media (hover: hover) {
  .flip:hover .flip-inner {
    transform: rotateY(180deg);
  }
}
.flip:focus-within .flip-inner,
.flip.flipped .flip-inner {
  transform: rotateY(180deg);
}
.flip:focus-visible {
  outline: none;
}
.flip:focus-visible .flip-inner {
  box-shadow: 0 0 0 4px var(--c-primary);
}
@media (prefers-reduced-motion: reduce) {
  .flip-inner {
    transition-duration: 0.01s;
  }
}
</style>
