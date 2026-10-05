<script setup lang="ts">
/**
 * minicms kind 12: photos in a fixed grid of rows × columns with a chessboard tint, and its own grid
 * size on phones. A photo with a link opens it; one without opens a larger view with its text.
 */
interface Item {
  image: string;
  title: string;
  text: string;
  link: string;
}

const props = defineProps<{ p: { size: string; mobileSize: string; items: Item[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const open = ref<Item | null>(null);

function parse(size: string, fallback: [number, number]): [number, number] {
  const [r, c] = String(size ?? '')
    .split('*')
    .map(Number);
  return r > 0 && c > 0 ? [r, c] : fallback;
}

const grids = computed(() =>
  [
    { key: 'desktop', size: parse(props.p.size, [2, 4]), class: 'hidden @3xl:grid' },
    { key: 'mobile', size: parse(props.p.mobileSize, [4, 2]), class: 'grid @3xl:hidden' },
  ].map((g) => ({
    ...g,
    style: { gridTemplateRows: `repeat(${g.size[0]}, minmax(0, 1fr))`, gridTemplateColumns: `repeat(${g.size[1]}, minmax(0, 1fr))` },
    cells: (props.p.items ?? []).slice(0, g.size[0] * g.size[1]).map((item, i) => {
      const row = Math.floor(i / g.size[1]);
      const col = i % g.size[1];
      return { item, i, dark: (row + col) % 2 === 0 };
    }),
  })),
);

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = null;
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <section class="h-[100dvh] min-h-[560px] w-full bg-surface py-24 text-ink @3xl:px-24 @3xl:py-32">
    <div v-for="g in grids" :key="g.key" class="h-full w-full" :class="g.class" :style="g.style">
      <component
        :is="editing ? 'div' : cell.item.link ? 'a' : 'button'"
        v-for="cell in g.cells"
        :key="cell.i"
        :href="!editing && cell.item.link ? resolveHref(cell.item.link, locale) : undefined"
        :type="!editing && !cell.item.link ? 'button' : undefined"
        :aria-label="cell.item.title || `Photo ${cell.i + 1}`"
        class="group relative overflow-hidden text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        :style="{ backgroundColor: cell.dark ? 'rgb(0 0 0 / 0.1)' : 'rgb(255 255 255 / 0.05)' }"
        @click="!editing && !cell.item.link && cell.item.image ? (open = cell.item) : undefined"
      >
        <img
          v-if="cell.item.image"
          :src="cell.item.image"
          :alt="cell.item.title"
          loading="lazy"
          class="absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-125 group-hover:brightness-75"
        />
        <div v-else class="photo-placeholder absolute inset-0" :style="{ opacity: cell.dark ? 0.85 : 0.6 }" />
        <!-- A light shade keeps titles readable on bright photos; hovering deepens it. -->
        <div v-if="cell.item.title" class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
        <div
          class="absolute inset-0 bg-gradient-to-t to-transparent opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100 [@media(hover:none)]:opacity-100"
          :class="cell.dark ? 'from-black/95 via-black/40' : 'from-black/85 via-transparent'"
        />
        <div class="pointer-events-none absolute inset-0 flex flex-col justify-end p-3 text-white @3xl:p-4">
          <div
            v-if="cell.item.title"
            class="origin-bottom translate-y-6 text-xs font-bold transition-all delay-100 duration-700 group-hover:translate-y-0 group-hover:scale-105 @3xl:text-base [@media(hover:none)]:translate-y-0"
          >
            {{ cell.item.title }}
          </div>
          <div
            v-if="cell.item.text"
            class="mt-1 line-clamp-2 origin-bottom translate-y-8 text-xs text-white/90 opacity-0 transition-all delay-200 duration-700 group-hover:translate-y-0 group-hover:opacity-100 @3xl:mt-2 @3xl:text-sm"
          >
            {{ cell.item.text }}
          </div>
        </div>
      </component>
    </div>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300"
        leave-active-class="transition duration-300"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          :aria-label="open.title"
          @click.self="open = null"
        >
          <div class="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-black shadow-2xl">
            <button
              type="button"
              class="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/75"
              aria-label="Close"
              @click="open = null"
            >
              <i class="mdi mdi-close text-2xl" />
            </button>
            <div class="flex min-h-0 flex-1 items-center justify-center">
              <img :src="open.image" :alt="open.title" class="max-h-[60vh] max-w-full object-contain p-4" />
            </div>
            <div v-if="open.title || open.text" class="border-t border-gray-700 bg-black/80 p-4 text-white">
              <h3 class="mb-2 text-lg font-bold">{{ open.title }}</h3>
              <p class="line-clamp-3 text-sm text-gray-300">{{ open.text }}</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>
