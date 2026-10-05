<script setup lang="ts">
/** Space between sections, optionally with a line, dots, or a wave/slant/curve shape in a theme color. */
const props = defineProps<{ p: { size: string; shape: string; color: string; flip: boolean }; locale: string }>();

const HEIGHT: Record<string, string> = { sm: 'h-8 @3xl:h-12', md: 'h-16 @3xl:h-24', lg: 'h-24 @3xl:h-40' };
const COLOR: Record<string, string> = {
  primary: 'var(--c-primary)',
  secondary: 'var(--c-secondary)',
  dark: 'var(--c-dark)',
  surface: 'var(--c-surface)',
};
const PATHS: Record<string, string> = {
  wave: 'M0 60 C 200 10, 400 110, 600 60 S 1000 10, 1200 60 L1200 120 L0 120 Z',
  slant: 'M0 120 L1200 0 L1200 120 Z',
  curve: 'M0 120 Q 600 -40 1200 120 Z',
};
const color = computed(() => COLOR[props.p.color] ?? COLOR.primary);
</script>

<template>
  <div class="relative w-full overflow-hidden" :class="HEIGHT[p.size] ?? HEIGHT.md" role="separator" aria-hidden="true">
    <div
      v-if="p.shape === 'line'"
      v-reveal
      class="absolute inset-x-[10%] top-1/2 h-px origin-center"
      :style="{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }"
    />
    <div v-else-if="p.shape === 'dots'" class="absolute inset-0 flex items-center justify-center gap-3">
      <span v-for="i in 3" :key="i" class="h-2 w-2 rounded-full" :style="{ background: color, opacity: i === 2 ? 1 : 0.5 }" />
    </div>
    <svg
      v-else-if="PATHS[p.shape]"
      class="absolute inset-0 h-full w-full"
      :class="{ 'rotate-180': p.flip }"
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
    >
      <path :d="PATHS[p.shape]" :fill="color" />
    </svg>
  </div>
</template>
