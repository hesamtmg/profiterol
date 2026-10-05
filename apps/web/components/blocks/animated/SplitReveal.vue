<script setup lang="ts">
/**
 * A picture cut in two halves that slide apart like doors as the visitor scrolls, uncovering a message behind.
 * Each half holds the whole picture (and its title) at double size, clipped to its own half, so the two join
 * seamlessly until they part. In the editor and for visitors who turn off motion the picture and the message
 * simply sit one after the other.
 */
import EditableText from '../../site/EditableText.vue';

const props = defineProps<{
  p: {
    image: string;
    coverTitle: string;
    eyebrow: string;
    title: string;
    text: string;
    buttonLabel: string;
    buttonLink: string;
    direction: string;
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const pinned = computed(() => !editing && !reduced.value);
const vertical = computed(() => props.p.direction === 'up-down');
const section = ref<HTMLElement | null>(null);

const progress = useScrollProgress(section, (r, vh) => (r.height > vh ? -r.top / (r.height - vh) : 1));
/** The doors open between 10% and 75% of the way through, easing in and out. */
const open = computed(() => {
  const t = between(progress.value, 0.1, 0.75);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
});

function doorStyle(second: boolean) {
  const shift = open.value * 100 * (second ? 1 : -1);
  return { transform: vertical.value ? `translateY(${shift}%)` : `translateX(${shift}%)` };
}
const messageStyle = computed(() => ({ opacity: 0.2 + open.value * 0.8, transform: `scale(${0.88 + open.value * 0.12})` }));
</script>

<template>
  <!-- Doors, while scrolling -->
  <section v-if="pinned" ref="section" class="relative h-[260vh] bg-surface text-ink">
    <div class="sticky top-0 h-[100dvh] min-h-[480px] overflow-hidden">
      <div class="absolute inset-0 flex flex-col items-center justify-center px-6 text-center" :style="messageStyle">
        <p v-if="p.eyebrow" class="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-primary">{{ p.eyebrow }}</p>
        <h2 class="max-w-4xl text-4xl font-black leading-tight tracking-tight @3xl:text-7xl">{{ p.title }}</h2>
        <p v-if="p.text" class="mt-5 max-w-xl text-lg font-light text-muted @3xl:text-xl">{{ p.text }}</p>
        <a
          v-if="p.buttonLabel"
          :href="resolveHref(p.buttonLink, locale)"
          :tabindex="open < 0.5 ? -1 : undefined"
          class="mt-8 inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-7 py-3 text-sm font-semibold text-white transition hover:scale-105"
        >
          {{ p.buttonLabel }} <i class="mdi mdi-arrow-right rtl:rotate-180" />
        </a>
      </div>

      <div
        v-for="second in [false, true]"
        :key="String(second)"
        class="pointer-events-none absolute overflow-hidden will-change-transform"
        :class="vertical ? ['inset-x-0 h-1/2', second ? 'bottom-0' : 'top-0'] : ['inset-y-0 w-1/2', second ? 'right-0' : 'left-0']"
        :style="doorStyle(second)"
        :aria-hidden="second ? 'true' : undefined"
      >
        <!-- The whole picture at double size, lined up so the halves meet in the middle -->
        <div
          class="absolute"
          :class="vertical ? ['inset-x-0 h-[200%]', second ? 'bottom-0' : 'top-0'] : ['inset-y-0 w-[200%]', second ? 'right-0' : 'left-0']"
        >
          <img v-if="p.image" :src="p.image" :alt="second ? '' : p.coverTitle" class="h-full w-full object-cover" />
          <div v-else class="photo-placeholder h-full w-full" />
          <div class="absolute inset-0 bg-black/25" />
          <p
            v-if="p.coverTitle"
            class="absolute inset-0 flex items-center justify-center px-6 text-center text-6xl font-black uppercase tracking-tight text-white drop-shadow-lg @3xl:text-9xl"
          >
            {{ p.coverTitle }}
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Still: the picture, then the message -->
  <section v-else class="bg-surface text-ink">
    <div class="relative flex h-[70dvh] min-h-[360px] items-center justify-center overflow-hidden">
      <img v-if="p.image" :src="p.image" :alt="p.coverTitle" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div v-else class="photo-placeholder absolute inset-0" />
      <div class="absolute inset-0 bg-black/25" />
      <p class="relative px-6 text-center text-6xl font-black uppercase tracking-tight text-white drop-shadow-lg @3xl:text-9xl">
        <EditableText :value="p.coverTitle" path="coverTitle" placeholder="Title on the picture" />
      </p>
    </div>
    <div class="flex flex-col items-center px-6 py-20 text-center @3xl:py-28">
      <p v-if="p.eyebrow || editing" class="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-primary">
        <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
      </p>
      <h2 class="max-w-4xl text-4xl font-black leading-tight tracking-tight @3xl:text-7xl">
        <EditableText :value="p.title" path="title" placeholder="Title" />
      </h2>
      <p v-if="p.text || editing" class="mt-5 max-w-xl text-lg font-light text-muted @3xl:text-xl">
        <EditableText :value="p.text" path="text" multiline />
      </p>
      <a
        v-if="p.buttonLabel"
        :href="editing ? undefined : resolveHref(p.buttonLink, locale)"
        class="mt-8 inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-7 py-3 text-sm font-semibold text-white transition hover:scale-105"
      >
        <EditableText :value="p.buttonLabel" path="buttonLabel" />
        <i class="mdi mdi-arrow-right rtl:rotate-180" />
      </a>
    </div>
  </section>
</template>
