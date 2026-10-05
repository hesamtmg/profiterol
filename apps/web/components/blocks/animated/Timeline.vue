<script setup lang="ts">
/**
 * Milestones along a line that draws itself as the visitor scrolls; each milestone lights up and slides in
 * when the line reaches it. Alternates sides on wide screens.
 */
import EditableText from '../../site/EditableText.vue';

interface Item {
  date: string;
  title: string;
  text: string;
}

const props = defineProps<{ p: { title: string; items: Item[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const list = ref<HTMLElement | null>(null);

// The line's tip follows 60% of the screen height down the list. Starts full, so the server page shows everything.
const progress = useScrollProgress(list, (r, vh) => (vh * 0.6 - r.top) / r.height, 1);
const tops = ref<number[]>([]);

function measure() {
  const el = list.value;
  if (!el) return;
  tops.value = [...el.querySelectorAll<HTMLElement>('[data-milestone]')].map((m) => (m.offsetTop + 24) / el.offsetHeight);
}

const lit = (i: number) => editing || reduced.value || progress.value >= (tops.value[i] ?? 0);

let resize: ResizeObserver | undefined;
onMounted(() => {
  resize = new ResizeObserver(measure);
  if (list.value) resize.observe(list.value);
  measure();
});
onBeforeUnmount(() => resize?.disconnect());
watch(() => props.p.items?.length, () => nextTick(measure));
</script>

<template>
  <section class="bg-surface px-6 py-20 text-ink @3xl:px-16 @3xl:py-28">
    <div class="mx-auto max-w-5xl">
      <h2 v-if="p.title || editing" class="mb-16 text-center text-3xl font-black @3xl:text-5xl"><EditableText :value="p.title" path="title" placeholder="Title" /></h2>

      <div ref="list" class="relative">
        <!-- The line, and its drawn part -->
        <div class="absolute bottom-0 start-[15px] top-0 w-0.5 bg-slate-200 @3xl:start-1/2 @3xl:-translate-x-1/2 rtl:@3xl:translate-x-1/2" aria-hidden="true">
          <div
            class="h-full origin-top bg-gradient-to-b from-primary to-secondary"
            :style="{ transform: `scaleY(${editing || reduced ? 1 : progress})` }"
          />
        </div>

        <ol class="space-y-12 @3xl:space-y-20">
          <li v-for="(item, i) in p.items" :key="i" data-milestone class="relative grid ps-12 @3xl:grid-cols-2 @3xl:gap-16 @3xl:ps-0">
            <!-- Dot -->
            <span
              class="absolute start-[16px] top-6 h-4 w-4 -translate-x-1/2 rounded-full border-4 transition-all duration-500 @3xl:start-1/2 rtl:translate-x-1/2"
              :class="lit(i) ? 'scale-125 border-primary bg-surface shadow-[0_0_0_6px_rgb(0_0_0/0.04)]' : 'border-slate-300 bg-surface'"
              aria-hidden="true"
            />
            <div
              class="rounded-[1.5rem] bg-white p-6 shadow-lg ring-1 ring-black/5 transition-all duration-700 @3xl:p-8"
              :class="[
                i % 2 ? '@3xl:col-start-2' : '@3xl:col-start-1 @3xl:text-end',
                lit(i) ? 'translate-x-0 opacity-100' : i % 2 ? 'opacity-0 @3xl:translate-x-12 rtl:@3xl:-translate-x-12' : 'opacity-0 @3xl:-translate-x-12 rtl:@3xl:translate-x-12',
                !lit(i) ? 'translate-y-6 @3xl:translate-y-0' : '',
              ]"
            >
              <p class="text-sm font-bold uppercase tracking-widest text-primary"><EditableText :value="item.date" :path="`items.${i}.date`" /></p>
              <h3 class="mt-2 text-xl font-bold @3xl:text-2xl"><EditableText :value="item.title" :path="`items.${i}.title`" /></h3>
              <p v-if="item.text || editing" class="mt-2 font-light text-muted"><EditableText :value="item.text" :path="`items.${i}.text`" multiline /></p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>
