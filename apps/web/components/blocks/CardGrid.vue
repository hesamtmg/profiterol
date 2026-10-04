<script setup lang="ts">
/** The amsr-portfolio service grid, with three card styles. */
interface Item {
  image: string;
  title: string;
  text: string;
  link: string;
}

const props = defineProps<{
  p: { title: string; subtitle: string; columns: string; variant: string; items: Item[] };
  locale: string;
}>();

// Class names are listed in full so Tailwind can find them.
const columns: Record<string, string> = {
  '2': '@2xl:grid-cols-2',
  '3': '@2xl:grid-cols-2 @4xl:grid-cols-3',
  '4': '@2xl:grid-cols-2 @5xl:grid-cols-4',
};

const variant = computed(() => props.p.variant || 'raised');
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div class="panel px-6 py-10 @3xl:px-20 @3xl:py-16">
      <h2 class="text-2xl font-black @3xl:text-4xl">{{ p.title }}</h2>
      <p v-if="p.subtitle" class="mt-2 max-w-2xl text-sm font-extralight text-muted @3xl:text-lg">{{ p.subtitle }}</p>
      <div class="mt-8 border-t border-slate-200 @3xl:mt-10" />

      <div class="mt-8 grid grid-cols-1 gap-5 @3xl:mt-10 @3xl:gap-8" :class="columns[p.columns] ?? columns['3']">
        <component
          :is="item.link ? 'a' : 'div'"
          v-for="(item, i) in p.items"
          :key="i"
          :href="item.link ? resolveHref(item.link, locale) : undefined"
          class="group block transition-all duration-500"
          :class="{
            'flex flex-col items-center px-2 py-4 text-center': variant === 'plain',
            'rounded-[2rem] border border-slate-100 bg-slate-50 p-7 hover:-translate-y-1.5 hover:border-transparent hover:bg-white hover:shadow-2xl hover:shadow-slate-300/50':
              variant === 'raised',
            'overflow-hidden rounded-[2rem] bg-slate-50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-slate-300/50':
              variant === 'photo',
          }"
        >
          <!-- Photo card -->
          <template v-if="variant === 'photo'">
            <div class="aspect-[4/3] overflow-hidden">
              <img
                v-if="item.image"
                :src="item.image"
                :alt="item.title"
                loading="lazy"
                class="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div
                v-else
                class="h-full w-full bg-gradient-to-br from-primary to-secondary transition-transform duration-1000 group-hover:scale-105"
              />
            </div>
            <div class="p-6">
              <h3 class="text-lg font-black">{{ item.title }}</h3>
              <p class="mt-2 text-sm font-extralight leading-relaxed text-muted">{{ item.text }}</p>
            </div>
          </template>

          <!-- Icon cards -->
          <template v-else>
            <img v-if="item.image" :src="item.image" :alt="''" loading="lazy" class="h-16 w-16 object-contain" />
            <div
              v-else
              class="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black text-white transition-transform duration-500 group-hover:rotate-6"
              :style="{ background: i % 2 ? 'var(--c-secondary)' : 'var(--c-primary)' }"
            >
              {{ String(i + 1).padStart(2, '0') }}
            </div>
            <h3 class="mt-5 text-lg font-black @3xl:text-xl">{{ item.title }}</h3>
            <p class="mt-2 text-sm font-extralight leading-relaxed text-muted">{{ item.text }}</p>
            <span
              v-if="item.link && variant === 'raised'"
              class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              <i class="mdi mdi-arrow-right transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </span>
          </template>
        </component>
      </div>
    </div>
  </section>
</template>
