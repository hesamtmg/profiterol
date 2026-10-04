<script setup lang="ts">
/** One card in the amsr-portfolio style, shared by the card grid and collection lists. */
import EditableText from './EditableText.vue';

const props = defineProps<{
  variant: string;
  index: number;
  title: string;
  text?: string;
  image?: string;
  href?: string;
  tags?: string[];
  date?: string | null;
  locale: string;
  /** Prop paths for editing the title and text in place (card grid in the editor). */
  titlePath?: string;
  textPath?: string;
}>();

// Show an empty text line in the editor so it can be filled in place.
const editing = Boolean(useBlockEditing());

const formattedDate = computed(() => {
  if (!props.date) return '';
  try {
    return new Intl.DateTimeFormat(props.locale === 'fa' ? 'fa-IR' : props.locale, { year: 'numeric', month: 'long' }).format(new Date(props.date));
  } catch {
    return '';
  }
});
</script>

<template>
  <component
    :is="href ? 'a' : 'div'"
    :href="href || undefined"
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
          v-if="image"
          :src="image"
          :alt="title"
          loading="lazy"
          class="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
        />
        <div
          v-else
          class="flex h-full w-full items-end bg-gradient-to-br p-6 transition-transform duration-1000 group-hover:scale-105"
          :class="index % 2 ? 'from-secondary to-dark' : 'from-primary to-secondary'"
        >
          <span class="text-5xl font-black text-white/80">{{ title?.[0] }}</span>
        </div>
      </div>
      <div class="p-6">
        <div v-if="tags?.length || formattedDate" class="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span v-for="t in tags" :key="t" class="rounded-full bg-white px-2.5 py-0.5 font-medium text-primary ring-1 ring-slate-200">{{ t }}</span>
          <span v-if="formattedDate" class="text-muted">{{ formattedDate }}</span>
        </div>
        <h3 class="text-lg font-black"><EditableText :value="title" :path="titlePath" /></h3>
        <p v-if="text || (textPath && editing)" class="mt-2 line-clamp-3 text-sm font-extralight leading-relaxed text-muted"><EditableText :value="text" :path="textPath" multiline /></p>
      </div>
    </template>

    <!-- Icon cards -->
    <template v-else>
      <img v-if="image" :src="image" alt="" loading="lazy" class="h-16 w-16 rounded-2xl object-cover" />
      <div
        v-else
        class="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black text-white transition-transform duration-500 group-hover:rotate-6"
        :style="{ background: index % 2 ? 'var(--c-secondary)' : 'var(--c-primary)' }"
      >
        {{ String(index + 1).padStart(2, '0') }}
      </div>
      <h3 class="mt-5 text-lg font-black @3xl:text-xl"><EditableText :value="title" :path="titlePath" /></h3>
      <p v-if="text || (textPath && editing)" class="mt-2 text-sm font-extralight leading-relaxed text-muted"><EditableText :value="text" :path="textPath" multiline /></p>
      <span v-if="href && variant === 'raised'" class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
        <i class="mdi mdi-arrow-right transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
      </span>
    </template>
  </component>
</template>
