<script setup lang="ts">
/**
 * A picture stays in place while the steps scroll past beside it; the picture cross-fades to each step's
 * own as that step reaches the middle of the screen. On phones each step shows its picture above it.
 */
import EditableText from '../../site/EditableText.vue';

interface Step {
  image: string;
  eyebrow: string;
  title: string;
  text: string;
}

const props = defineProps<{ p: { title: string; imageSide: string; steps: Step[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const active = ref(0);
const stepEls = ref<HTMLElement[]>([]);
let observer: IntersectionObserver | undefined;

function observe() {
  observer?.disconnect();
  // A step is current while it crosses the middle band of the screen.
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) active.value = Number((e.target as HTMLElement).dataset.step);
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  stepEls.value.forEach((el) => observer!.observe(el));
}

onMounted(observe);
onBeforeUnmount(() => observer?.disconnect());
watch(
  () => props.p.steps?.length,
  () => nextTick(observe),
);
</script>

<template>
  <section class="bg-surface px-6 py-20 text-ink @3xl:px-16 @3xl:py-28">
    <div class="mx-auto max-w-6xl">
      <h2 v-if="p.title || editing" class="mb-12 text-3xl font-black @3xl:mb-4 @3xl:text-5xl">
        <EditableText :value="p.title" path="title" placeholder="Title" />
      </h2>

      <div class="grid gap-12 @3xl:grid-cols-2 @3xl:gap-16">
        <!-- Sticky picture (wide screens) -->
        <div class="hidden @3xl:block" :class="{ '@3xl:order-2': p.imageSide === 'end' }">
          <div class="sticky top-[12vh] h-[76vh] overflow-hidden rounded-[2rem] shadow-2xl">
            <div
              v-for="(step, i) in p.steps"
              :key="i"
              class="absolute inset-0 transition-all duration-700 ease-out"
              :class="i === active ? 'scale-100 opacity-100' : 'scale-110 opacity-0'"
              :aria-hidden="i !== active"
            >
              <img v-if="step.image" :src="step.image" :alt="step.title" class="h-full w-full object-cover" loading="lazy" />
              <div v-else class="photo-placeholder flex h-full w-full items-center justify-center">
                <span class="text-[10rem] font-black text-white/25">{{ String(i + 1).padStart(2, '0') }}</span>
              </div>
            </div>
            <!-- Where you are -->
            <div class="absolute bottom-6 start-6 flex items-center gap-3 text-white">
              <span class="rounded-full bg-black/45 px-3 py-1 font-mono text-xs backdrop-blur" dir="ltr"
                >{{ String(active + 1).padStart(2, '0') }} / {{ String(p.steps?.length ?? 0).padStart(2, '0') }}</span
              >
            </div>
            <div class="absolute end-6 top-1/2 flex -translate-y-1/2 flex-col gap-2" aria-hidden="true">
              <span
                v-for="(_, i) in p.steps"
                :key="i"
                class="w-1.5 rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.25)] transition-all duration-500"
                :class="i === active ? 'h-8 opacity-100' : 'h-1.5 opacity-50'"
              />
            </div>
          </div>
        </div>

        <!-- Steps -->
        <ol>
          <li
            v-for="(step, i) in p.steps"
            :key="i"
            :ref="(el) => el && (stepEls[i] = el as HTMLElement)"
            :data-step="i"
            class="flex flex-col justify-center py-6 transition-all duration-500 @3xl:min-h-[70vh] @3xl:py-0"
            :class="editing || i === active ? 'opacity-100' : '@3xl:translate-y-2 @3xl:opacity-25'"
          >
            <div class="mb-6 aspect-[4/3] overflow-hidden rounded-[1.5rem] @3xl:hidden">
              <img v-if="step.image" :src="step.image" :alt="step.title" class="h-full w-full object-cover" loading="lazy" />
              <div v-else class="photo-placeholder h-full w-full" />
            </div>
            <p v-if="step.eyebrow || editing" class="text-sm font-bold uppercase tracking-widest text-primary">
              <EditableText :value="step.eyebrow" :path="`steps.${i}.eyebrow`" placeholder="Small line" />
            </p>
            <h3 class="mt-2 text-3xl font-black @3xl:text-5xl"><EditableText :value="step.title" :path="`steps.${i}.title`" /></h3>
            <p v-if="step.text || editing" class="mt-4 max-w-md text-lg font-light leading-relaxed text-muted">
              <EditableText :value="step.text" :path="`steps.${i}.text`" multiline />
            </p>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>
