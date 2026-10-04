<script setup lang="ts">
/**
 * Cards for the latest published items of a collection. On the public site the API attaches
 * the items to the block (`data`), so pages render on the server; in the editor they are fetched here.
 */
import CardItem from '../site/CardItem.vue';
import { gridColumns } from '../site/grid';
import type { CollectionListData } from '~/composables/useCollections';

const props = defineProps<{
  p: {
    title: string;
    subtitle: string;
    collection: string;
    variant: string;
    columns: string;
    limit: number;
    tag: string;
    showFilters: boolean;
    buttonLabel: string;
  };
  locale: string;
  data?: CollectionListData;
  /** Collection index pages hide the "see all" button and the panel title. */
  embedded?: boolean;
}>();

const api = useApi();
const fetched = ref<CollectionListData | null>(null);
const active = ref<string | null>(null);

const list = computed(() => props.data ?? fetched.value);
const items = computed(() => (list.value?.items ?? []).filter((i) => !active.value || i.tags.includes(active.value)));

async function load() {
  if (props.data) return;
  try {
    fetched.value = await api<CollectionListData>(`/public/${props.locale}/items`, {
      query: { collection: props.p.collection, limit: props.p.limit || 6, tag: props.p.tag || undefined },
    });
  } catch {
    fetched.value = { collection: null, items: [], tags: [] };
  }
}

onMounted(load);
watch(() => [props.p.collection, props.p.limit, props.p.tag, props.locale], load);
</script>

<template>
  <section :class="embedded ? '' : 'px-3 py-3 @3xl:px-6'">
    <div :class="embedded ? '' : 'panel px-6 py-10 @3xl:px-20 @3xl:py-16'">
      <div v-if="!embedded" class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black @3xl:text-4xl">{{ p.title }}</h2>
          <p v-if="p.subtitle" class="mt-2 max-w-2xl text-sm font-extralight text-muted @3xl:text-lg">{{ p.subtitle }}</p>
        </div>
        <a
          v-if="p.buttonLabel && list?.collection"
          :href="list.collection.href"
          class="btn-pill border border-slate-200 hover:border-primary hover:text-primary"
        >
          {{ p.buttonLabel }} <i class="mdi mdi-arrow-right rtl:rotate-180" />
        </a>
      </div>

      <div v-if="p.showFilters && (list?.tags.length ?? 0) > 1" class="flex flex-wrap gap-2" :class="embedded ? '' : 'mt-8'">
        <button
          type="button"
          class="rounded-full px-4 py-1.5 text-sm transition"
          :class="!active ? 'bg-dark text-white' : 'bg-slate-100 hover:bg-slate-200'"
          @click="active = null"
        >
          {{ locale === 'fa' ? 'همه' : 'All' }}
        </button>
        <button
          v-for="t in list?.tags"
          :key="t"
          type="button"
          class="rounded-full px-4 py-1.5 text-sm transition"
          :class="active === t ? 'bg-dark text-white' : 'bg-slate-100 hover:bg-slate-200'"
          @click="active = active === t ? null : t"
        >
          {{ t }}
        </button>
      </div>

      <div v-if="!embedded && !p.showFilters" class="mt-8 border-t border-slate-200 @3xl:mt-10" />

      <TransitionGroup
        tag="div"
        class="mt-8 grid grid-cols-1 gap-5 @3xl:gap-8"
        :class="gridColumns(p.columns)"
        move-class="transition-all duration-500"
        enter-active-class="transition-all duration-500"
        enter-from-class="opacity-0 translate-y-4"
        leave-active-class="hidden"
      >
        <CardItem
          v-for="(item, i) in items"
          :key="item.id"
          :variant="p.variant || 'photo'"
          :index="i"
          :title="item.title"
          :text="item.excerpt"
          :image="item.cover"
          :href="item.href"
          :tags="item.tags"
          :date="item.publishedAt"
          :locale="locale"
        />
      </TransitionGroup>

      <p v-if="list && !items.length" class="mt-8 rounded-[2rem] bg-slate-50 p-10 text-center text-sm font-extralight text-muted">
        {{
          list.collection
            ? locale === 'fa' ? 'هنوز موردی منتشر نشده است.' : 'Nothing published here yet.'
            : locale === 'fa' ? 'این مجموعه پیدا نشد.' : 'Choose a collection for this block.'
        }}
      </p>
    </div>
  </section>
</template>
