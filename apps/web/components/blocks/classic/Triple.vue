<script setup lang="ts">
/** minicms kind 2: a title over up to three wide photo links that zoom and reveal their text on hover. */
import EditableText from '../../site/EditableText.vue';
import ResponsiveImg from '../../site/ResponsiveImg.vue';

interface Item {
  image: string;
  mobileImage: string;
  title: string;
  text: string;
  link: string;
}

defineProps<{ p: { title: string; items: Item[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
</script>

<template>
  <section class="w-full bg-surface py-12 text-ink">
    <h2
      v-if="p.title || editing"
      v-reveal
      class="mx-4 pb-8 pt-8 text-center text-2xl font-semibold @3xl:mx-10 @3xl:pb-12 @3xl:pt-12 @3xl:text-4xl"
    >
      <EditableText :value="p.title" path="title" placeholder="Title" />
    </h2>

    <div class="flex flex-col items-center justify-center gap-4 px-4 text-center @3xl:flex-row @3xl:items-stretch @3xl:gap-6 @5xl:px-8">
      <component
        :is="editing || !item.link ? 'div' : 'a'"
        v-for="(item, i) in p.items"
        :key="i"
        v-reveal="{ delay: i * 120 }"
        :href="editing || !item.link ? undefined : resolveHref(item.link, locale)"
        class="group relative block w-full max-w-md overflow-hidden rounded-lg transition-all duration-500 hover:scale-105 hover:shadow-2xl"
      >
        <div class="relative aspect-video w-full overflow-hidden bg-gray-900">
          <ResponsiveImg
            v-if="item.image || item.mobileImage"
            :src="item.image"
            :mobile="item.mobileImage"
            :alt="item.title"
            img-class="h-full w-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-75"
          />
          <div v-else class="photo-placeholder h-full w-full" />
        </div>
        <!-- A light shade keeps the title readable on bright photos; hovering deepens it. -->
        <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
        <div
          class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        />
        <div class="absolute inset-0 flex flex-col justify-end p-4 text-start text-white @3xl:p-6">
          <h3
            class="translate-y-8 text-lg font-bold transition-all duration-700 group-hover:translate-y-0 @3xl:text-2xl [@media(hover:none)]:translate-y-0"
          >
            <EditableText :value="item.title" :path="`items.${i}.title`" />
          </h3>
          <p
            v-if="item.text || editing"
            class="mt-2 line-clamp-2 translate-y-12 text-xs text-white/90 opacity-0 transition-all delay-100 duration-700 group-hover:translate-y-0 group-hover:opacity-100 @3xl:line-clamp-3 @3xl:text-base [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100"
          >
            <EditableText :value="item.text" :path="`items.${i}.text`" multiline />
          </p>
        </div>
      </component>
    </div>
  </section>
</template>
