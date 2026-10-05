<script setup lang="ts">
/** minicms kind 8: a title and intro, then a longer text with its own heading beside a portrait photo. */
import EditableText from '../../site/EditableText.vue';

const props = defineProps<{
  p: { title: string; text: string; title2: string; subtitle2: string; body: string; image: string };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const paragraphs = computed(() =>
  String(props.p.body ?? '')
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean),
);
</script>

<template>
  <section class="w-full bg-surface px-6 py-16 text-ink @3xl:px-16 @3xl:py-24">
    <div class="mx-auto max-w-6xl">
      <div v-reveal class="mb-10">
        <h2 class="text-3xl font-bold"><EditableText :value="p.title" path="title" placeholder="Title" /></h2>
        <p v-if="p.text || editing" class="mt-2 text-base font-light text-muted"><EditableText :value="p.text" path="text" multiline /></p>
      </div>

      <div class="grid gap-10 @3xl:grid-cols-[7fr_5fr] @3xl:gap-14">
        <div v-reveal="{ delay: 100 }" class="max-h-[1200px] overflow-y-auto">
          <h3 class="text-3xl font-bold"><EditableText :value="p.title2" path="title2" placeholder="Second title" /></h3>
          <small v-if="p.subtitle2 || editing" class="block text-base font-light text-muted"
            ><EditableText :value="p.subtitle2" path="subtitle2"
          /></small>
          <div class="mt-8 space-y-4 leading-relaxed">
            <p v-if="editing" class="whitespace-pre-line"><EditableText :value="p.body" path="body" multiline /></p>
            <p v-for="(t, i) in paragraphs" v-else :key="i">{{ t }}</p>
          </div>
        </div>

        <figure v-reveal="{ delay: 200 }" class="m-0">
          <img v-if="p.image" :src="p.image" alt="" loading="lazy" class="w-full rounded-sm border border-slate-200 object-cover" />
          <div v-else class="photo-placeholder aspect-[853/1087] w-full rounded-sm" />
        </figure>
      </div>
    </div>
  </section>
</template>
