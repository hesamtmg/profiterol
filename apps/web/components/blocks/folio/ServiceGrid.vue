<script setup lang="ts">
/**
 * A label and a link above a row of outlined cells sharing their borders, each with a number and an arrow in the
 * main color, a title and a short text. Pointing at a cell tints it and sends its arrow off to the corner.
 */
import EditableText from '../../site/EditableText.vue';
import { folioColors, folioLabel } from './look';

interface Service {
  title: string;
  text: string;
  link: string;
}

const props = defineProps<{
  p: { label: string; linkLabel: string; link: string; services: Service[]; look: string };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const colors = computed(() => folioColors(props.p.look));
const two = (n: number) => String(n).padStart(2, '0');
</script>

<template>
  <section class="px-5 py-20 @3xl:px-14 @3xl:py-28" :class="colors.panel">
    <div class="mb-8 flex items-center justify-between gap-4 @3xl:mb-10" :class="folioLabel">
      <span class="opacity-60"><EditableText :value="p.label" path="label" placeholder="Label" /></span>
      <a
        v-if="p.linkLabel || editing"
        :href="editing ? undefined : resolveHref(p.link, locale)"
        class="transition-colors hover:text-primary"
      >
        <EditableText :value="p.linkLabel" path="linkLabel" placeholder="All →" />
      </a>
    </div>

    <ul class="grid border-s border-t @3xl:grid-cols-2 @5xl:grid-cols-4" :class="colors.line">
      <li v-for="(service, i) in p.services" :key="i" class="border-b border-e" :class="colors.line">
        <component
          :is="service.link && !editing ? 'a' : 'div'"
          :href="service.link && !editing ? resolveHref(service.link, locale) : undefined"
          class="group flex h-full min-h-64 flex-col p-7 transition-colors duration-500 hover:bg-[color-mix(in_srgb,var(--c-primary)_8%,transparent)]"
        >
          <span class="flex items-center justify-between font-mono text-xs text-primary">
            <span class="tabular-nums">{{ two(i + 1) }}</span>
            <i
              class="mdi mdi-arrow-top-right text-base transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
              aria-hidden="true"
            />
          </span>
          <h3 class="mt-14 text-3xl font-bold tracking-tight @3xl:text-4xl">
            <EditableText :value="service.title" :path="`services.${i}.title`" placeholder="Title" />
          </h3>
          <p class="mt-4 max-w-xs leading-relaxed opacity-70">
            <EditableText :value="service.text" :path="`services.${i}.text`" multiline />
          </p>
        </component>
      </li>
    </ul>
  </section>
</template>
