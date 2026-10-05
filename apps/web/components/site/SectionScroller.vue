<script setup lang="ts">
/**
 * minicms's scroll view: the page settles on each section as you scroll, and a bar at the bottom shows
 * which section you are in (taken from its heading) with buttons for the previous and next one, plus dots
 * at the side to jump anywhere. Snapping is "proximity", so tall sections can still be read freely.
 */
const props = defineProps<{ locale: string; target?: string }>();

interface Section {
  el: HTMLElement;
  title: string;
}

const sections = ref<Section[]>([]);
const current = ref(0);
let observer: IntersectionObserver | undefined;
const fa = computed(() => props.locale === 'fa');

function titleOf(el: HTMLElement, i: number) {
  const heading = el.querySelector('h1, h2, h3');
  const text = heading?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  return text.slice(0, 60) || (fa.value ? `بخش ${new Intl.NumberFormat('fa-IR').format(i + 1)}` : `Section ${i + 1}`);
}

function go(i: number) {
  const s = sections.value[Math.max(0, Math.min(i, sections.value.length - 1))];
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  s?.el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
}

function onKey(e: KeyboardEvent) {
  if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')) return;
  if (e.altKey && e.key === 'ArrowDown') go(current.value + 1);
  else if (e.altKey && e.key === 'ArrowUp') go(current.value - 1);
}

onMounted(() => {
  document.documentElement.classList.add('snap-sections');
  const root = document.querySelector(props.target ?? 'main');
  const els = Array.from(root?.children ?? []).filter((e): e is HTMLElement => e instanceof HTMLElement && e.offsetHeight > 0);
  sections.value = els.map((el, i) => ({ el, title: titleOf(el, i) }));
  // A section is current while it covers the middle of the screen.
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) current.value = els.indexOf(e.target as HTMLElement);
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  els.forEach((el) => observer!.observe(el));
  window.addEventListener('keydown', onKey);
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove('snap-sections');
  observer?.disconnect();
  window.removeEventListener('keydown', onKey);
});

const num = (n: number) => (fa.value ? new Intl.NumberFormat('fa-IR', { minimumIntegerDigits: 2 }).format(n) : String(n).padStart(2, '0'));
</script>

<template>
  <div v-if="sections.length > 1">
    <!-- Bottom bar: where you are, previous, next -->
    <nav
      class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex items-center justify-between gap-2 px-4 @3xl:bottom-6 @3xl:px-10"
      :aria-label="fa ? 'بخش‌های صفحه' : 'Page sections'"
    >
      <p
        class="section-pill pointer-events-auto flex h-[46px] min-w-0 items-center gap-3 rounded-full px-5 text-sm @3xl:px-8 @3xl:text-base"
      >
        <span class="font-mono text-xs opacity-70">{{ num(current + 1) }} / {{ num(sections.length) }}</span>
        <Transition
          mode="out-in"
          enter-active-class="transition duration-300"
          enter-from-class="opacity-0 translate-y-2"
          leave-active-class="transition duration-150"
          leave-to-class="opacity-0"
        >
          <span :key="current" class="truncate font-light">{{ sections[current]?.title }}</span>
        </Transition>
      </p>
      <div class="pointer-events-auto flex shrink-0 gap-2">
        <button
          type="button"
          class="section-pill flex h-[46px] w-[46px] items-center justify-center rounded-full text-xl transition hover:scale-105 disabled:opacity-40"
          :disabled="current === 0"
          :aria-label="fa ? 'بخش قبلی' : 'Previous section'"
          @click="go(current - 1)"
        >
          <i class="mdi mdi-chevron-up" />
        </button>
        <button
          type="button"
          class="section-pill flex h-[46px] w-[46px] items-center justify-center rounded-full text-xl transition hover:scale-105 disabled:opacity-40"
          :disabled="current === sections.length - 1"
          :aria-label="fa ? 'بخش بعدی' : 'Next section'"
          @click="go(current + 1)"
        >
          <i class="mdi mdi-chevron-down" />
        </button>
      </div>
    </nav>

    <!-- Dots at the side -->
    <ol
      class="fixed end-4 top-1/2 z-50 hidden -translate-y-1/2 flex-col gap-2.5 @3xl:flex"
      :aria-label="fa ? 'رفتن به بخش' : 'Go to section'"
    >
      <li v-for="(s, i) in sections" :key="i">
        <button
          type="button"
          class="group relative flex h-4 w-4 items-center justify-center"
          :aria-label="s.title"
          :aria-current="i === current ? 'true' : undefined"
          @click="go(i)"
        >
          <span
            class="block rounded-full transition-all duration-300"
            :class="i === current ? 'h-3 w-3 bg-primary ring-4 ring-white/70' : 'h-2 w-2 bg-slate-400/80 group-hover:bg-primary'"
          />
          <span
            class="section-pill pointer-events-none absolute end-6 whitespace-nowrap rounded-full px-3 py-1 text-xs opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            {{ s.title }}
          </span>
        </button>
      </li>
    </ol>
  </div>
</template>

<style>
/* Dark frosted pills, readable over both light and dark sections. */
.section-pill {
  background: rgb(15 15 20 / 0.45);
  color: #fff;
  backdrop-filter: blur(10px) saturate(150%);
  -webkit-backdrop-filter: blur(10px) saturate(150%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.12),
    0 6px 16px rgb(0 0 0 / 0.15);
}
html.snap-sections {
  scroll-snap-type: y proximity;
}
html.snap-sections main > * {
  scroll-snap-align: start;
}
/* Room under the last section so the bar never covers its buttons. */
html.snap-sections main {
  padding-bottom: 5.5rem;
}
</style>
