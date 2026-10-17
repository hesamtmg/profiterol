<script setup lang="ts">
/**
 * The undplus.com footer: on black, a pill-shaped label over a column of underlined links, big profile icons, and a
 * bottom line with the copyright, the name and the cities.
 */
import EditableText from '../../site/EditableText.vue';
import NetworkIcon from './NetworkIcon.vue';

const props = defineProps<{
  p: {
    label: string;
    links: { label: string; link: string }[];
    social: { network: string; link: string }[];
    name: string;
    place: string;
    copyright: string;
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const href = (link: string) => (link && !editing ? resolveHref(link, props.locale) : undefined);
const external = (link: string) => /^https?:/i.test(link);
</script>

<template>
  <footer class="bg-dark px-5 pb-10 pt-20 text-white @3xl:px-10 @3xl:pt-28">
    <span v-if="p.label || editing" class="inline-block rounded-full border border-current px-2.5 py-0.5 text-base">
      <EditableText :value="p.label" path="label" placeholder="Label" />
    </span>
    <nav class="mt-3 flex flex-col items-start gap-2 text-base">
      <component
        :is="href(item.link) ? 'a' : 'span'"
        v-for="(item, i) in p.links"
        :key="i"
        :href="href(item.link)"
        class="underline underline-offset-2 transition-opacity hover:opacity-60"
      >
        <EditableText :value="item.label" :path="`links.${i}.label`" placeholder="Link" />
      </component>
    </nav>

    <div class="mt-28 flex flex-wrap items-end justify-between gap-x-10 gap-y-8 @3xl:mt-56">
      <div class="flex gap-5 text-[2.6rem] leading-none">
        <a
          v-for="(item, i) in p.social"
          :key="i"
          :href="href(item.link)"
          :target="external(item.link) ? '_blank' : undefined"
          :rel="external(item.link) ? 'noopener' : undefined"
          :aria-label="item.network"
          class="transition-transform duration-300 hover:-rotate-6 hover:scale-110"
        >
          <NetworkIcon :network="item.network" />
        </a>
      </div>
      <div class="flex flex-wrap items-end gap-x-10 gap-y-2 text-sm @3xl:text-base">
        <p class="opacity-70"><EditableText :value="p.copyright" path="copyright" placeholder="©" /></p>
        <p class="font-semibold uppercase tracking-wide"><EditableText :value="p.name" path="name" placeholder="Name" /></p>
        <p class="opacity-70"><EditableText :value="p.place" path="place" placeholder="Cities" /></p>
      </div>
    </div>
  </footer>
</template>
