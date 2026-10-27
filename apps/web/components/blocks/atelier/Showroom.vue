<script setup lang="ts">
/**
 * The whitecotton.pt showroom: a deep brown panel with the products on a dark shelf, four to a row (two on phones),
 * each lit from above under a rail, with its name in small capitals. Tabs made from the products' categories filter
 * the shelf. A line and a link close it.
 */
import EditableText from '../../site/EditableText.vue';
import AtelierHeading from './AtelierHeading.vue';

interface Item {
  image: string;
  name: string;
  category: string;
  link: string;
}

const props = defineProps<{
  p: {
    eyebrow: string;
    title: string;
    titleItalic: string;
    allLabel: string;
    items: Item[];
    note: string;
    buttonLabel: string;
    buttonLink: string;
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const href = (link: string) => (link && !editing ? resolveHref(link, props.locale) : undefined);

const tabs = computed(() => [...new Set(props.p.items.map((i) => i.category.trim()).filter(Boolean))]);
const active = ref('');
const shown = computed(() =>
  props.p.items.map((item, i) => ({ item, i })).filter(({ item }) => !active.value || item.category.trim() === active.value),
);
</script>

<template>
  <section class="atelier-dark px-6 py-20 text-white @3xl:px-14 @3xl:py-28">
    <div class="mx-auto max-w-6xl">
      <div v-reveal><AtelierHeading :p="p" size="xl" /></div>

      <div v-if="tabs.length > 1" class="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-b border-white/10 pb-4" role="tablist">
        <button
          v-for="tab in ['', ...tabs]"
          :key="tab || 'all'"
          type="button"
          role="tab"
          :aria-selected="active === tab"
          class="text-[0.65rem] font-medium uppercase tracking-[0.28em] transition"
          :class="active === tab ? 'text-white' : 'text-white/45 hover:text-white/80'"
          @click="active = tab"
        >
          {{ tab || p.allLabel || '—' }}
        </button>
      </div>

      <TransitionGroup tag="div" name="shelf" class="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-white/5 @3xl:grid-cols-4">
        <component
          :is="href(item.link) ? 'a' : 'div'"
          v-for="{ item, i } in shown"
          :key="i"
          :href="href(item.link)"
          class="group relative flex aspect-[4/5] flex-col bg-[#120d0b]"
        >
          <!-- The rail and the light falling from it -->
          <span class="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-white/30 to-white/5" aria-hidden="true" />
          <span
            class="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_10%,rgb(255_244_230/0.16),transparent_70%)]"
            aria-hidden="true"
          />
          <div class="relative flex-1 overflow-hidden">
            <img
              v-if="item.image"
              :src="item.image"
              :alt="item.name"
              class="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
              loading="lazy"
            />
            <div v-else class="photo-placeholder h-full w-full opacity-40" />
          </div>
          <p
            class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pb-4 pt-10 text-center text-[0.6rem] font-medium uppercase tracking-[0.3em] text-white/70 group-hover:text-white"
          >
            <EditableText :value="item.name" :path="`items.${i}.name`" placeholder="Name" />
          </p>
        </component>
      </TransitionGroup>

      <div class="mt-8 text-center">
        <p v-if="p.note || editing" class="text-[0.6rem] uppercase tracking-[0.3em] text-white/35">
          <EditableText :value="p.note" path="note" placeholder="Line" />
        </p>
        <component
          :is="href(p.buttonLink) ? 'a' : 'span'"
          v-if="p.buttonLabel || editing"
          :href="href(p.buttonLink)"
          class="mt-4 inline-flex items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.28em] text-white/70 hover:text-white"
        >
          <EditableText :value="p.buttonLabel" path="buttonLabel" placeholder="Link" />
          <i class="mdi mdi-arrow-right rtl:rotate-180" />
        </component>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Products coming back when a tab is chosen fade in; the others simply leave. */
.shelf-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}
.shelf-enter-from {
  opacity: 0;
  transform: scale(0.97);
}
</style>
