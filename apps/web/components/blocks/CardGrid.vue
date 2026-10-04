<script setup lang="ts">
/** The amsr-portfolio service grid, with three card styles. */
import CardItem from '../site/CardItem.vue';
import { gridColumns } from '../site/grid';

interface Item {
  image: string;
  title: string;
  text: string;
  link: string;
}

defineProps<{
  p: { title: string; subtitle: string; columns: string; variant: string; items: Item[] };
  locale: string;
}>();
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div class="panel px-6 py-10 @3xl:px-20 @3xl:py-16">
      <h2 class="text-2xl font-black @3xl:text-4xl">{{ p.title }}</h2>
      <p v-if="p.subtitle" class="mt-2 max-w-2xl text-sm font-extralight text-muted @3xl:text-lg">{{ p.subtitle }}</p>
      <div class="mt-8 border-t border-slate-200 @3xl:mt-10" />

      <div class="mt-8 grid grid-cols-1 gap-5 @3xl:mt-10 @3xl:gap-8" :class="gridColumns(p.columns)">
        <CardItem
          v-for="(item, i) in p.items"
          :key="i"
          :variant="p.variant || 'raised'"
          :index="i"
          :title="item.title"
          :text="item.text"
          :image="item.image"
          :href="item.link ? resolveHref(item.link, locale) : undefined"
          :locale="locale"
        />
      </div>
    </div>
  </section>
</template>
