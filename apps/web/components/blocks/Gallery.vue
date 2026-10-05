<script setup lang="ts">
/** Photos in an even grid or masonry columns; clicking one opens a full-screen viewer. */
import EditableText from '../site/EditableText.vue';
import { gridColumns } from '../site/grid';

interface Photo {
  image: string;
  caption: string;
}

const props = defineProps<{ p: { title: string; layout: string; columns: string; images: Photo[] } }>();
const editing = Boolean(useBlockEditing());
const photos = computed(() => (props.p.images ?? []).filter((i) => i.image));
const open = ref<number | null>(null);

const masonry: Record<string, string> = {
  '2': '@2xl:columns-2',
  '3': '@2xl:columns-2 @4xl:columns-3',
  '4': '@2xl:columns-3 @5xl:columns-4',
};

function show(i: number) {
  if (!editing) open.value = i;
}

function step(delta: number) {
  if (open.value === null) return;
  open.value = (open.value + delta + photos.value.length) % photos.value.length;
}

function onKey(e: KeyboardEvent) {
  if (open.value === null) return;
  const rtl = document.documentElement.dir === 'rtl';
  if (e.key === 'Escape') open.value = null;
  else if (e.key === 'ArrowRight') step(rtl ? -1 : 1);
  else if (e.key === 'ArrowLeft') step(rtl ? 1 : -1);
}

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <section v-if="photos.length || editing" class="px-3 py-3 @3xl:px-6">
    <div class="panel px-6 py-10 @3xl:px-20 @3xl:py-16">
      <h2 v-if="p.title || editing" class="mb-8 text-2xl font-black @3xl:text-4xl"><EditableText :value="p.title" path="title" placeholder="Title" /></h2>

      <div
        v-if="!photos.length"
        class="flex h-48 flex-col items-center justify-center rounded-[2rem] border-4 border-dashed border-slate-200 text-sm text-muted"
        dir="ltr"
      >
        <i class="mdi mdi-image-multiple-outline text-4xl" />
        {{ $t('Add photos in the panel on the right.') }}
      </div>

      <div v-else-if="p.layout === 'masonry'" class="columns-1 gap-5" :class="masonry[p.columns] ?? masonry['3']">
        <figure v-for="(photo, i) in photos" :key="i" class="mb-5 break-inside-avoid">
          <button type="button" class="group block w-full overflow-hidden rounded-[1.5rem]" :aria-label="photo.caption || `Photo ${i + 1}`" @click="show(i)">
            <img :src="photo.image" :alt="photo.caption" loading="lazy" class="w-full transition-transform duration-700 group-hover:scale-105" />
          </button>
          <figcaption v-if="photo.caption" class="mt-2 text-sm font-extralight text-muted">{{ photo.caption }}</figcaption>
        </figure>
      </div>

      <div v-else class="grid grid-cols-2 gap-3 @3xl:gap-5" :class="gridColumns(p.columns)">
        <button
          v-for="(photo, i) in photos"
          :key="i"
          type="button"
          class="group relative aspect-square overflow-hidden rounded-[1.5rem]"
          :aria-label="photo.caption || `Photo ${i + 1}`"
          @click="show(i)"
        >
          <img :src="photo.image" :alt="photo.caption" loading="lazy" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <span
            v-if="photo.caption"
            class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-start text-sm text-white opacity-0 transition group-hover:opacity-100"
          >
            {{ photo.caption }}
          </span>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <Transition enter-active-class="transition-opacity duration-300" leave-active-class="transition-opacity duration-300" enter-from-class="opacity-0" leave-to-class="opacity-0">
        <div v-if="open !== null" class="fixed inset-0 z-[70] flex flex-col bg-black/90 p-4 text-white" role="dialog" aria-modal="true" @click.self="open = null">
          <div class="flex items-center justify-between" dir="ltr">
            <span class="text-sm opacity-70">{{ open + 1 }} / {{ photos.length }}</span>
            <button type="button" class="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close" @click="open = null">
              <i class="mdi mdi-close text-2xl" />
            </button>
          </div>
          <div class="flex min-h-0 flex-1 items-center justify-center gap-4" dir="ltr" @click.self="open = null">
            <button v-if="photos.length > 1" type="button" class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Previous photo" @click="step(-1)">
              <i class="mdi mdi-chevron-left text-3xl" />
            </button>
            <figure class="flex max-h-full min-w-0 flex-col items-center">
              <img :src="photos[open].image" :alt="photos[open].caption" class="max-h-[78vh] max-w-full rounded-2xl object-contain" />
              <figcaption v-if="photos[open].caption" class="mt-3 text-center text-sm opacity-80">{{ photos[open].caption }}</figcaption>
            </figure>
            <button v-if="photos.length > 1" type="button" class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Next photo" @click="step(1)">
              <i class="mdi mdi-chevron-right text-3xl" />
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>
