<script setup lang="ts">
/**
 * An OpenStreetMap map (no API key, no tracking cookies) with a pin, beside or under a card with the
 * address, phone and opening hours, and links to open the place in Google Maps or OpenStreetMap.
 */
import EditableText from '../site/EditableText.vue';

const props = defineProps<{
  p: { title: string; lat: number; lng: number; zoom: string; address: string; phone: string; hours: string; layout: string };
  locale: string;
}>();

const editing = Boolean(useBlockEditing());
const fa = computed(() => props.locale === 'fa');
const lat = computed(() => Math.min(85, Math.max(-85, Number(props.p.lat) || 0)));
const lng = computed(() => Math.min(180, Math.max(-180, Number(props.p.lng) || 0)));
/** Half the width of the visible area in degrees, per zoom choice. */
const SPAN: Record<string, number> = { '13': 0.04, '15': 0.01, '17': 0.0025 };

const embed = computed(() => {
  const d = SPAN[props.p.zoom] ?? 0.01;
  const bbox = [lng.value - d, lat.value - d / 2, lng.value + d, lat.value + d / 2].map((n) => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.value.toFixed(5)},${lng.value.toFixed(5)}`;
});
const googleLink = computed(() => `https://www.google.com/maps/search/?api=1&query=${lat.value},${lng.value}`);
const osmLink = computed(() => `https://www.openstreetmap.org/?mlat=${lat.value}&mlon=${lng.value}#map=${props.p.zoom || 15}/${lat.value}/${lng.value}`);
const side = computed(() => props.p.layout === 'side');
</script>

<template>
  <section class="bg-surface px-3 py-3 text-ink @3xl:px-6">
    <div class="relative overflow-hidden rounded-[2rem] @3xl:rounded-card" :class="side ? 'grid bg-white @3xl:grid-cols-[2fr_3fr]' : ''">
      <!-- Details -->
      <div
        class="z-10 p-8 @3xl:p-12"
        :class="side ? '' : 'relative bg-white @3xl:absolute @3xl:start-8 @3xl:top-8 @3xl:w-96 @3xl:rounded-[2rem] @3xl:shadow-2xl'"
      >
        <h2 class="text-2xl font-black @3xl:text-4xl"><EditableText :value="p.title" path="title" placeholder="Title" /></h2>
        <ul class="mt-6 space-y-4 text-sm @3xl:text-base">
          <li v-if="p.address || editing" class="flex gap-3">
            <i class="mdi mdi-map-marker-outline text-xl text-primary" />
            <span class="whitespace-pre-line"><EditableText :value="p.address" path="address" multiline placeholder="Address" /></span>
          </li>
          <li v-if="p.phone" class="flex gap-3">
            <i class="mdi mdi-phone-outline text-xl text-primary" />
            <a :href="`tel:${p.phone.replace(/\s/g, '')}`" dir="ltr" class="hover:underline">{{ p.phone }}</a>
          </li>
          <li v-if="p.hours || editing" class="flex gap-3">
            <i class="mdi mdi-clock-outline text-xl text-primary" />
            <span class="whitespace-pre-line"><EditableText :value="p.hours" path="hours" multiline placeholder="Opening hours" /></span>
          </li>
        </ul>
        <div class="mt-8 flex flex-wrap gap-2">
          <a :href="googleLink" target="_blank" rel="noopener noreferrer" class="btn-pill bg-primary text-white hover:brightness-110">
            <i class="mdi mdi-directions" /> {{ fa ? 'مسیریابی' : 'Directions' }}
          </a>
          <a :href="osmLink" target="_blank" rel="noopener noreferrer" class="btn-pill bg-slate-100 text-ink hover:bg-slate-200">OpenStreetMap</a>
        </div>
      </div>

      <!-- Map -->
      <iframe
        :src="embed"
        :title="fa ? 'نقشه' : 'Map'"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        class="block w-full border-0"
        :class="[side ? 'h-80 @3xl:h-full @3xl:min-h-[28rem]' : 'h-80 @3xl:h-[34rem]', { 'pointer-events-none': editing }]"
      />
    </div>
  </section>
</template>
