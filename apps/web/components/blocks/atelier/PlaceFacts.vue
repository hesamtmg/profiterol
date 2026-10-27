<script setup lang="ts">
/**
 * The whitecotton.pt "real place, real people": a two-tone title and text; a wide photo of the place with its city
 * and address on it and a map link; beside it a white card of details (hours, email…). Below, a row of big key facts
 * and a card of the certificates the business works with.
 */
import EditableText from '../../site/EditableText.vue';
import AtelierHeading from './AtelierHeading.vue';

interface Pair {
  value: string;
  label: string;
}

const props = defineProps<{
  p: {
    eyebrow: string;
    title: string;
    titleItalic: string;
    text: string;
    image: string;
    place: string;
    address: string;
    mapLabel: string;
    mapLink: string;
    details: Pair[];
    facts: Pair[];
    badgesTitle: string;
    badges: { name: string; text: string }[];
    badgesNote: string;
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const href = (link: string) => (link && !editing ? resolveHref(link, props.locale) : undefined);
</script>

<template>
  <section class="atelier-paper px-6 py-20 text-ink @3xl:px-14 @3xl:py-28">
    <div class="mx-auto max-w-6xl">
      <div class="grid gap-6 @3xl:grid-cols-[3fr_2fr] @3xl:items-end">
        <div v-reveal><AtelierHeading :p="p" size="xl" /></div>
        <p v-if="p.text || editing" class="max-w-md whitespace-pre-line text-sm leading-relaxed text-muted">
          <EditableText :value="p.text" path="text" multiline placeholder="Text" />
        </p>
      </div>

      <div class="mt-12 grid gap-4 @3xl:grid-cols-[3fr_2fr]">
        <div v-reveal class="relative min-h-[18rem] overflow-hidden rounded-[1.25rem] bg-dark text-white @3xl:min-h-[22rem]">
          <img v-if="p.image" :src="p.image" alt="" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div v-else class="photo-placeholder absolute inset-0" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div class="absolute inset-x-6 bottom-6">
            <p class="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.3em] text-white/70">
              <i class="mdi mdi-map-marker-outline text-sm" /><EditableText :value="p.place" path="place" placeholder="Place" />
            </p>
            <p class="mt-2 text-lg font-medium"><EditableText :value="p.address" path="address" placeholder="Address" /></p>
            <component
              :is="href(p.mapLink) ? 'a' : 'span'"
              v-if="p.mapLabel || editing"
              :href="href(p.mapLink)"
              :target="p.mapLink?.startsWith('http') ? '_blank' : undefined"
              rel="noopener"
              class="mt-3 inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.25em] text-white/60 hover:text-white"
            >
              <EditableText :value="p.mapLabel" path="mapLabel" placeholder="Map link" />
              <i class="mdi mdi-arrow-top-right rtl:-scale-x-100" />
            </component>
          </div>
        </div>
        <dl
          v-if="p.details.length"
          v-reveal="{ delay: 120 }"
          class="divide-y divide-black/5 rounded-[1.25rem] bg-white/80 p-6 shadow-sm backdrop-blur"
        >
          <div v-for="(d, i) in p.details" :key="i" class="py-3 first:pt-0 last:pb-0">
            <dt class="text-[0.6rem] uppercase tracking-[0.25em] text-muted">
              <EditableText :value="d.label" :path="`details.${i}.label`" placeholder="Label" />
            </dt>
            <dd class="mt-1 text-sm"><EditableText :value="d.value" :path="`details.${i}.value`" placeholder="Value" /></dd>
          </div>
        </dl>
      </div>

      <div class="mt-4 grid gap-4 @3xl:grid-cols-[3fr_2fr]">
        <div v-if="p.facts.length" class="grid grid-cols-2 gap-px overflow-hidden rounded-[1.25rem] bg-black/5 @xl:grid-cols-4">
          <div v-for="(f, i) in p.facts" :key="i" v-reveal="{ delay: i * 80 }" class="bg-white/80 px-4 py-6 text-center">
            <p class="text-3xl font-medium tracking-tight">
              <EditableText :value="f.value" :path="`facts.${i}.value`" placeholder="Number" />
            </p>
            <p class="mt-1 text-[0.6rem] uppercase tracking-[0.22em] text-muted">
              <EditableText :value="f.label" :path="`facts.${i}.label`" placeholder="Label" />
            </p>
          </div>
        </div>
        <div v-if="p.badges.length || editing" class="rounded-[1.25rem] bg-white/80 p-6 shadow-sm">
          <p class="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.25em] text-muted">
            <i class="mdi mdi-check-decagram-outline text-sm text-primary" /><EditableText
              :value="p.badgesTitle"
              path="badgesTitle"
              placeholder="Certificates"
            />
          </p>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <div v-for="(b, i) in p.badges" :key="i" class="rounded-lg border border-black/5 px-3 py-2.5">
              <p class="text-xs font-semibold"><EditableText :value="b.name" :path="`badges.${i}.name`" placeholder="Name" /></p>
              <p class="mt-0.5 text-[0.65rem] leading-snug text-muted">
                <EditableText :value="b.text" :path="`badges.${i}.text`" placeholder="What it means" />
              </p>
            </div>
          </div>
          <p v-if="p.badgesNote || editing" class="mt-4 text-[0.65rem] text-muted">
            <EditableText :value="p.badgesNote" path="badgesNote" placeholder="Line" />
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
