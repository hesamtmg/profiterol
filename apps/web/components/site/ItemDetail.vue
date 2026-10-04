<script setup lang="ts">
/** A collection item's own page: cover, story, custom field details, gallery and related items. */
import type { FieldDef } from '@profiterol/blocks';
import CardItem from './CardItem.vue';
import { paragraphs, type PublicItem } from '~/composables/useCollections';

const props = defineProps<{ entry: PublicItem; locale: string }>();
const item = computed(() => props.entry.item);
const fa = computed(() => props.locale === 'fa');

function label(f: FieldDef) {
  return f.labels?.[props.locale] || f.label;
}

function has(v: unknown) {
  return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
}

/** Short values go in the details list beside the story; long ones go below it. */
const details = computed(() =>
  props.entry.collection.fields.filter((f) => ['text', 'number', 'url', 'boolean', 'color'].includes(f.type) && has(item.value.data[f.key])),
);
const longText = computed(() => props.entry.collection.fields.filter((f) => f.type === 'textarea' && has(item.value.data[f.key])));
const images = computed(() => props.entry.collection.fields.filter((f) => f.type === 'image' && has(item.value.data[f.key])));
const videos = computed(() => props.entry.collection.fields.filter((f) => f.type === 'video' && has(item.value.data[f.key])));
const galleries = computed(() => props.entry.collection.fields.filter((f) => f.type === 'list' && has(item.value.data[f.key])));

const date = computed(() => {
  if (!item.value.publishedAt) return '';
  return new Intl.DateTimeFormat(fa.value ? 'fa-IR' : props.locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date(item.value.publishedAt),
  );
});

const lightbox = ref<string | null>(null);
</script>

<template>
  <article>
    <!-- Header -->
    <section class="px-3 py-3 @3xl:px-6">
      <div class="panel overflow-hidden p-3 @3xl:p-5">
        <div class="px-4 pb-8 pt-6 @3xl:px-14 @3xl:pb-12 @3xl:pt-10">
          <a :href="entry.collection.href" class="inline-flex items-center gap-2 text-sm text-muted hover:text-primary">
            <i class="mdi mdi-arrow-left rtl:rotate-180" /> {{ entry.collection.name }}
          </a>
          <div v-if="item.tags.length" class="mt-6 flex flex-wrap gap-2">
            <span v-for="t in item.tags" :key="t" class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-primary">{{ t }}</span>
          </div>
          <h1 class="mt-4 max-w-4xl text-4xl font-black leading-tight @3xl:text-7xl">{{ item.title }}</h1>
          <p v-if="item.excerpt" class="mt-5 max-w-2xl text-lg font-extralight text-muted @3xl:text-2xl">{{ item.excerpt }}</p>
          <p v-if="date" class="mt-6 text-sm text-muted">{{ date }}</p>
        </div>
        <div class="aspect-[16/9] overflow-hidden rounded-[1.75rem] @3xl:aspect-[21/9] @3xl:rounded-[3rem]">
          <img v-if="item.cover" :src="item.cover" :alt="item.title" class="h-full w-full object-cover" />
          <div v-else class="h-full w-full bg-gradient-to-br from-primary via-secondary to-dark" />
        </div>
      </div>
    </section>

    <!-- Story + details -->
    <section v-if="paragraphs(item.body).length || details.length || longText.length || images.length || videos.length" class="px-3 py-3 @3xl:px-6">
      <div class="panel grid gap-10 px-6 py-10 @3xl:grid-cols-[2fr_1fr] @3xl:gap-16 @3xl:px-20 @3xl:py-16">
        <div class="min-w-0 space-y-5 text-base font-extralight leading-loose @3xl:text-lg">
          <p v-for="(para, i) in paragraphs(item.body)" :key="i" class="whitespace-pre-line">{{ para }}</p>
          <div v-for="f in longText" :key="f.key">
            <h2 class="mb-2 text-xl font-black">{{ label(f) }}</h2>
            <p v-for="(para, i) in paragraphs(String(item.data[f.key]))" :key="i" class="mt-3 whitespace-pre-line">{{ para }}</p>
          </div>
          <img
            v-for="f in images"
            :key="f.key"
            :src="String(item.data[f.key])"
            :alt="label(f)"
            loading="lazy"
            class="w-full rounded-[2rem] object-cover"
          />
          <video
            v-for="f in videos"
            :key="f.key"
            :src="String(item.data[f.key])"
            :aria-label="label(f)"
            controls
            preload="metadata"
            class="w-full rounded-[2rem] bg-dark"
          />
        </div>
        <dl v-if="details.length" class="h-fit space-y-5 rounded-[2rem] bg-slate-50 p-7">
          <div v-for="f in details" :key="f.key">
            <dt class="text-xs font-medium uppercase tracking-wider text-muted">{{ label(f) }}</dt>
            <dd class="mt-1 text-base font-medium">
              <a
                v-if="f.type === 'url'"
                :href="String(item.data[f.key])"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 text-primary hover:underline"
                dir="ltr"
              >
                {{ String(item.data[f.key]).replace(/^https?:\/\//, '') }} <i class="mdi mdi-open-in-new text-sm" />
              </a>
              <span v-else-if="f.type === 'boolean'">{{ item.data[f.key] ? (fa ? 'بله' : 'Yes') : fa ? 'خیر' : 'No' }}</span>
              <span v-else-if="f.type === 'color'" class="inline-flex items-center gap-2">
                <span class="h-5 w-5 rounded-full ring-1 ring-slate-200" :style="{ background: String(item.data[f.key]) }" />
                <code class="text-sm">{{ item.data[f.key] }}</code>
              </span>
              <span v-else>{{ item.data[f.key] }}</span>
            </dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Galleries -->
    <section v-for="f in galleries" :key="f.key" class="px-3 py-3 @3xl:px-6">
      <div class="panel px-6 py-10 @3xl:px-20 @3xl:py-16">
        <h2 class="text-2xl font-black @3xl:text-3xl">{{ label(f) }}</h2>
        <div class="mt-8 columns-1 gap-5 @2xl:columns-2 @4xl:columns-3">
          <figure
            v-for="(g, i) in (item.data[f.key] as { image: string; caption: string }[]).filter((g) => g.image)"
            :key="i"
            class="mb-5 break-inside-avoid"
          >
            <button type="button" class="block w-full overflow-hidden rounded-[1.5rem]" @click="lightbox = g.image">
              <img :src="g.image" :alt="g.caption" loading="lazy" class="w-full transition-transform duration-700 hover:scale-105" />
            </button>
            <figcaption v-if="g.caption" class="mt-2 text-sm font-extralight text-muted">{{ g.caption }}</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- Related -->
    <section v-if="entry.related.length" class="px-3 py-3 @3xl:px-6">
      <div class="panel px-6 py-10 @3xl:px-20 @3xl:py-16">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <h2 class="text-2xl font-black @3xl:text-3xl">{{ fa ? `بیشتر از ${entry.collection.name}` : `More ${entry.collection.name.toLowerCase()}` }}</h2>
          <a :href="entry.collection.href" class="btn-pill border border-slate-200 hover:border-primary hover:text-primary">
            {{ fa ? 'مشاهده همه' : 'See all' }} <i class="mdi mdi-arrow-right rtl:rotate-180" />
          </a>
        </div>
        <div class="mt-8 grid grid-cols-1 gap-5 @2xl:grid-cols-2 @4xl:grid-cols-3 @3xl:gap-8">
          <CardItem
            v-for="(r, i) in entry.related"
            :key="r.id"
            variant="photo"
            :index="i"
            :title="r.title"
            :text="r.excerpt"
            :image="r.cover"
            :href="r.href"
            :tags="r.tags"
            :date="r.publishedAt"
            :locale="locale"
          />
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="lightbox"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
        role="dialog"
        @click="lightbox = null"
        @keydown.esc="lightbox = null"
      >
        <img :src="lightbox" alt="" class="max-h-full max-w-full rounded-2xl" />
      </div>
    </Teleport>
  </article>
</template>
