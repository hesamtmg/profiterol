<script setup lang="ts">
/**
 * Big centered names between two small labels. While scrolling, the name nearest the middle of the screen is sharp
 * and the others fade the further they are from it; pointing at one brings it forward too. In the editor and for
 * visitors who turn off motion every name is fully shown.
 */
import EditableText from '../../site/EditableText.vue';

const props = defineProps<{ p: { label: string; items: { title: string; link: string }[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const list = ref<HTMLElement | null>(null);
const focus = ref<number[]>([]);

useScrollFrame(() => {
  if (!list.value) return;
  const middle = window.innerHeight / 2;
  focus.value = Array.from(list.value.children).map((el) => {
    const r = el.getBoundingClientRect();
    return Math.max(0, 1 - Math.abs(r.top + r.height / 2 - middle) / (window.innerHeight * 0.4));
  });
});

const opacity = (i: number) => (editing || reduced.value ? 1 : 0.18 + 0.82 * (focus.value[i] ?? 1));
const href = (link: string) => (link && !editing ? resolveHref(link, props.locale) : undefined);
</script>

<template>
  <section class="bg-surface px-5 py-24 text-center text-ink @3xl:py-32">
    <p v-if="p.label || editing" class="text-lg font-medium @3xl:text-2xl">
      <EditableText :value="p.label" path="label" placeholder="Label" />
    </p>
    <ul ref="list" class="my-14 @3xl:my-20">
      <li v-for="(item, i) in p.items" :key="i" class="transition-opacity duration-300 hover:!opacity-100" :style="{ opacity: opacity(i) }">
        <component
          :is="href(item.link) ? 'a' : 'span'"
          :href="href(item.link)"
          class="inline-block text-[clamp(1.75rem,4.8cqw,4.5rem)] font-normal leading-[1.28] tracking-tight transition-transform duration-300 hover:scale-[1.03]"
        >
          <EditableText :value="item.title" :path="`items.${i}.title`" placeholder="Name" />
        </component>
      </li>
    </ul>
    <p v-if="p.label" class="text-lg font-medium @3xl:text-2xl" aria-hidden="true">{{ p.label }}</p>
  </section>
</template>
