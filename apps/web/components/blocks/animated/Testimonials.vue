<script setup lang="ts">
/**
 * Quotes that take turns. Each one's bar fills over its time and moves on when full; hovering pauses the
 * bar, clicking one jumps to that quote. No autoplay in the editor or for visitors who turn off motion.
 */
import EditableText from '../../site/EditableText.vue';

interface Item {
  quote: string;
  name: string;
  role: string;
  photo: string;
}

const props = defineProps<{ p: { title: string; items: Item[]; seconds: number }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const active = ref(0);
const paused = ref(false);
const count = computed(() => props.p.items?.length ?? 0);
const current = computed(() => props.p.items?.[active.value]);
const autoplay = computed(() => !editing && !reduced.value && count.value > 1);
const seconds = computed(() => Math.max(Number(props.p.seconds) || 6, 2));

function initials(name: string) {
  return String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function next() {
  if (count.value) active.value = (active.value + 1) % count.value;
}

watch(count, (n) => {
  if (active.value >= n) active.value = 0;
});
</script>

<template>
  <section
    class="relative overflow-hidden bg-dark px-6 py-20 text-white @3xl:px-16 @3xl:py-32"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
  >
    <div
      class="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-primary opacity-20 blur-[120px]"
      aria-hidden="true"
    />
    <div class="relative mx-auto max-w-4xl text-center">
      <h2 v-if="p.title || editing" class="mb-10 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
        <EditableText :value="p.title" path="title" placeholder="Title" />
      </h2>
      <i class="mdi mdi-format-quote-open text-7xl leading-none text-primary opacity-60" aria-hidden="true" />

      <div class="grid min-h-[16rem] place-items-center" aria-live="polite">
        <Transition
          mode="out-in"
          enter-active-class="transition duration-700 ease-out"
          enter-from-class="opacity-0 translate-y-6 blur-sm"
          leave-active-class="transition duration-300 ease-in"
          leave-to-class="opacity-0 -translate-y-4 blur-sm"
        >
          <figure v-if="current" :key="active">
            <blockquote class="text-2xl font-light leading-relaxed @3xl:text-4xl">
              <EditableText :value="current.quote" :path="`items.${active}.quote`" multiline />
            </blockquote>
            <figcaption class="mt-10 flex items-center justify-center gap-4">
              <img
                v-if="current.photo"
                :src="current.photo"
                alt=""
                class="h-14 w-14 rounded-full object-cover ring-2 ring-primary ring-offset-4 ring-offset-dark"
              />
              <span v-else class="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold">{{
                initials(current.name)
              }}</span>
              <span class="text-start">
                <span class="block font-semibold"><EditableText :value="current.name" :path="`items.${active}.name`" /></span>
                <span class="block text-sm opacity-60"><EditableText :value="current.role" :path="`items.${active}.role`" /></span>
              </span>
            </figcaption>
          </figure>
        </Transition>
      </div>

      <div v-if="count > 1" class="mx-auto mt-12 flex max-w-md gap-2" role="tablist">
        <button
          v-for="(item, i) in p.items"
          :key="i"
          type="button"
          role="tab"
          :aria-selected="i === active"
          :aria-label="item.name || `Quote ${i + 1}`"
          class="relative h-1 flex-1 overflow-hidden rounded-full bg-white/20 py-0 before:absolute before:-inset-y-3 before:inset-x-0 before:content-['']"
          @click="active = i"
        >
          <span
            v-if="i === active && autoplay"
            :key="`run-${active}`"
            class="absolute inset-0 origin-left rounded-full bg-primary rtl:origin-right"
            :style="{ animation: `fill-x ${seconds}s linear both`, animationPlayState: paused ? 'paused' : 'running' }"
            @animationend="next"
          />
          <span v-else-if="i <= active" class="absolute inset-0 rounded-full bg-primary" :class="{ 'opacity-40': i < active }" />
        </button>
      </div>
    </div>
  </section>
</template>
