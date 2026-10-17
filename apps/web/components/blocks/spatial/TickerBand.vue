<script setup lang="ts">
/**
 * A slim colored band gliding past endlessly: logos, profile links with their icons, or one sentence repeated, with a
 * small shape between the items. Pointing at it pauses it. Logos turn white on dark bands and black on light ones.
 */
import EditableText from '../../site/EditableText.vue';
import NetworkIcon from './NetworkIcon.vue';
import SpatialShape from './SpatialShape.vue';

interface Item {
  label: string;
  image: string;
  icon: string;
  link: string;
}

const props = defineProps<{ p: { items: Item[]; separator: string; seconds: number; reverse: boolean; look: string }; locale: string }>();
const editing = Boolean(useBlockEditing());

const colors = computed(
  () =>
    ({
      second: 'bg-secondary text-dark',
      dark: 'bg-dark text-white',
      light: 'bg-surface text-ink border-y border-[color-mix(in_srgb,currentColor_15%,transparent)]',
    })[props.p.look] ?? 'bg-primary text-dark',
);
const logoFilter = computed(() => (props.p.look === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)'));
const separatorColor = computed(() => (props.p.look === 'light' || props.p.look === 'dark' ? 'text-primary' : 'text-white'));

/** Repeat short lists so one copy is wider than the screen; the track holds two copies and slides by one. */
const row = computed(() => {
  const items = props.p.items.filter((i) => i.label || i.image);
  if (!items.length) return [];
  const out: Item[] = [];
  while (out.length < 8) out.push(...items);
  return out;
});
const duration = computed(() => `${Math.max(Number(props.p.seconds) || 30, 5)}s`);
const href = (link: string) => (link && !editing ? resolveHref(link, props.locale) : undefined);
const external = (link: string) => /^https?:/i.test(link);
</script>

<template>
  <section class="group overflow-hidden" :class="colors" dir="ltr">
    <!-- In the editor, the first copy of each item can be typed into; the glide stops there. -->
    <div
      class="flex w-max items-center group-hover:[animation-play-state:paused]"
      :class="editing ? '' : 'motion-safe-only'"
      :style="
        editing ? undefined : { animation: `slide-x ${duration} linear infinite`, animationDirection: p.reverse ? 'reverse' : 'normal' }
      "
    >
      <template v-for="copy in 2" :key="copy">
        <template v-for="(item, i) in row" :key="`${copy}-${i}`">
          <component
            :is="href(item.link) ? 'a' : 'span'"
            :href="href(item.link)"
            :target="external(item.link) ? '_blank' : undefined"
            :rel="external(item.link) ? 'noopener' : undefined"
            :aria-hidden="copy === 2 || i >= p.items.length ? 'true' : undefined"
            :tabindex="copy === 2 || i >= p.items.length ? -1 : undefined"
            class="flex h-12 shrink-0 items-center gap-2.5 whitespace-nowrap px-6 text-base font-medium transition-opacity hover:opacity-70 @3xl:h-14 @3xl:px-8 @3xl:text-lg"
            :dir="locale === 'fa' ? 'rtl' : undefined"
          >
            <NetworkIcon v-if="item.icon" :network="item.icon" class="text-2xl" />
            <img
              v-if="item.image"
              :src="item.image"
              :alt="item.label"
              class="h-6 w-auto max-w-[140px] object-contain @3xl:h-7"
              :style="{ filter: logoFilter }"
              loading="lazy"
            />
            <EditableText v-else-if="copy === 1 && i < p.items.length" :value="item.label" :path="`items.${i}.label`" placeholder="Text" />
            <span v-else>{{ item.label }}</span>
          </component>
          <span v-if="p.separator !== 'none'" class="h-7 w-7 shrink-0" :class="separatorColor" aria-hidden="true">
            <SpatialShape :shape="p.separator" />
          </span>
        </template>
      </template>
    </div>
  </section>
</template>
