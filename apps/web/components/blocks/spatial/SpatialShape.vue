<script setup lang="ts">
/** One of the undplus.com cut-out shapes in the current text color, optionally turning slowly. */
import { shapePath } from './shapes';

const props = defineProps<{ shape: string; spin?: boolean; reverse?: boolean; seconds?: number }>();
const drawing = computed(() => shapePath(props.shape));
</script>

<template>
  <svg
    viewBox="0 0 100 100"
    class="block h-full w-full overflow-visible"
    :class="spin ? 'motion-safe-only' : ''"
    :style="
      spin ? { animation: `spatial-spin ${seconds ?? 14}s linear infinite`, animationDirection: reverse ? 'reverse' : 'normal' } : undefined
    "
    aria-hidden="true"
  >
    <path v-if="drawing.stroke" :d="drawing.d" fill="none" stroke="currentColor" stroke-width="7" />
    <path v-else :d="drawing.d" fill="currentColor" />
  </svg>
</template>
