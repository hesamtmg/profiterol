<script setup lang="ts">
/** A big statement whose words light up one after another as the visitor scrolls through it. */
import EditableText from '../../site/EditableText.vue';

const props = defineProps<{ p: { eyebrow: string; text: string }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const box = ref<HTMLElement | null>(null);
const words = computed(() => String(props.p.text ?? '').split(/\s+/).filter(Boolean));

// 0 when the text's top reaches 85% of the screen height, 1 when its bottom passes 45%.
const progress = useScrollProgress(box, (r, vh) => (vh * 0.85 - r.top) / (r.height + vh * 0.4), 1);

/** Each word fades from dim to full as the progress passes it; the next word is part-lit. */
function opacity(i: number) {
  if (editing || reduced.value) return 1;
  const lit = progress.value * words.value.length;
  return 0.14 + 0.86 * Math.min(1, Math.max(0, lit - i));
}
</script>

<template>
  <section class="bg-surface px-6 py-24 text-ink @3xl:px-16 @3xl:py-40">
    <div ref="box" class="mx-auto max-w-5xl">
      <p v-if="p.eyebrow || editing" class="mb-6 text-sm font-semibold uppercase tracking-[0.25em] text-primary">
        <EditableText :value="p.eyebrow" path="eyebrow" placeholder="Small line" />
      </p>
      <p class="text-3xl font-bold leading-snug tracking-tight @3xl:text-5xl @5xl:text-6xl">
        <EditableText v-if="editing" :value="p.text" path="text" multiline />
        <template v-else>
          <template v-for="(w, i) in words" :key="i">
            <span class="transition-opacity duration-200" :style="{ opacity: opacity(i) }">{{ w }}</span>{{ ' ' }}
          </template>
        </template>
      </p>
    </div>
  </section>
</template>
