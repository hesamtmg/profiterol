<script setup lang="ts">
defineProps<{ p: { title: string; subtitle: string; items: { q: string; a: string }[] } }>();
const open = ref<number | null>(0);
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div class="panel grid gap-8 px-6 py-10 @3xl:grid-cols-[2fr_3fr] @3xl:gap-16 @3xl:px-20 @3xl:py-16">
      <div>
        <h2 class="text-2xl font-black @3xl:text-4xl">{{ p.title }}</h2>
        <p v-if="p.subtitle" class="mt-3 text-sm font-extralight text-muted @3xl:text-lg">{{ p.subtitle }}</p>
      </div>
      <ul>
        <li v-for="(item, i) in p.items" :key="i" class="border-b border-slate-200">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-4 py-5 text-start text-base font-medium @3xl:text-lg"
            :aria-expanded="open === i"
            @click="open = open === i ? null : i"
          >
            {{ item.q }}
            <i class="mdi mdi-plus text-xl transition-transform duration-500" :class="{ 'rotate-45 text-primary': open === i }" />
          </button>
          <div class="grid transition-all duration-700 ease-in-out" :class="open === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'">
            <p class="overflow-hidden whitespace-pre-line text-sm font-extralight leading-loose text-muted @3xl:text-base">
              <span class="block pb-5">{{ item.a }}</span>
            </p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
