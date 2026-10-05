<script setup lang="ts">
/** Logos gliding past endlessly (optionally two rows in opposite directions), grey until hovered. */
import EditableText from '../../site/EditableText.vue';

interface Logo {
  image: string;
  name: string;
  link: string;
}

const props = defineProps<{ p: { title: string; logos: Logo[]; seconds: number; twoRows: boolean; look: string }; locale: string }>();
const editing = Boolean(useBlockEditing());

/** Repeat short lists so one copy is always wider than the screen; the track holds two copies and slides by one. */
const row = computed(() => {
  const logos = (props.p.logos ?? []).filter((l) => l.image || l.name);
  if (!logos.length) return [];
  const out: Logo[] = [];
  while (out.length < 10) out.push(...logos);
  return out;
});
const rows = computed(() => (props.p.twoRows ? [false, true] : [false]));
const duration = computed(() => `${Math.max(Number(props.p.seconds) || 30, 5)}s`);
</script>

<template>
  <section class="overflow-hidden py-16 @3xl:py-20" :class="p.look === 'dark' ? 'bg-dark text-white' : 'bg-surface text-ink'">
    <h2 v-if="p.title || editing" class="mb-10 text-center text-sm font-semibold uppercase tracking-[0.3em] opacity-60">
      <EditableText :value="p.title" path="title" placeholder="Title" />
    </h2>
    <div
      v-for="reverse in rows"
      :key="String(reverse)"
      class="group relative flex overflow-hidden py-3"
      dir="ltr"
      style="mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent); -webkit-mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent)"
    >
      <div
        class="motion-safe-only flex w-max shrink-0 items-center group-hover:[animation-play-state:paused]"
        :style="{ animation: `slide-x ${duration} linear infinite`, animationDirection: reverse ? 'reverse' : 'normal' }"
      >
        <template v-for="copy in 2" :key="copy">
          <component
            :is="logo.link && !editing ? 'a' : 'span'"
            v-for="(logo, i) in row"
            :key="`${copy}-${i}`"
            :href="logo.link && !editing ? resolveHref(logo.link, locale) : undefined"
            :aria-hidden="copy === 2 || i >= (p.logos?.length ?? 0) ? 'true' : undefined"
            :tabindex="copy === 2 || i >= (p.logos?.length ?? 0) ? -1 : undefined"
            class="mx-6 flex h-14 shrink-0 items-center opacity-50 grayscale transition duration-300 hover:scale-110 hover:opacity-100 hover:grayscale-0 @3xl:mx-10"
          >
            <img v-if="logo.image" :src="logo.image" :alt="logo.name" class="h-10 w-auto max-w-[160px] object-contain @3xl:h-12" loading="lazy" />
            <span v-else class="whitespace-nowrap text-2xl font-black tracking-tight @3xl:text-3xl">{{ logo.name }}</span>
          </component>
        </template>
      </div>
    </div>
  </section>
</template>
