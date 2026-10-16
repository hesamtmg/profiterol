<script setup lang="ts">
/**
 * A dark panel with a big title at the top; numbered service cards stick below it one after another, each sliding up
 * over the last and landing slightly tilted, so they pile up like papers. Cards underneath turn a little grayer for
 * every card on top. In the editor and for visitors who turn off motion they are a plain list.
 */
import EditableText from '../../site/EditableText.vue';

interface Service {
  title: string;
  text: string;
  drawing: string;
  buttonLabel: string;
  buttonLink: string;
}

defineProps<{ p: { title: string; services: Service[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const stacked = computed(() => !editing && !reduced.value);
const cardEls = ref<HTMLElement[]>([]);
/** How far each card has come to rest (0–1), and how many lie on top of it. */
const landed = ref<number[]>([]);

useScrollFrame(() => {
  const vh = window.innerHeight;
  landed.value = cardEls.value.map((el) => {
    const stick = parseFloat(getComputedStyle(el).top) || 0;
    return between(vh - el.getBoundingClientRect().top, 0, vh - stick);
  });
});

const tilts = [-1.6, 2.2, -2.6, 1.4, -1.2, 2.8, -2, 1.8];
function cardStyle(i: number) {
  if (!stacked.value) return {};
  const land = landed.value[i] ?? 0;
  const depth = landed.value.slice(i + 1).reduce((sum, v) => sum + v, 0);
  const tone = Math.min(depth, 3) * 5;
  return {
    transform: `rotate(${tilts[i % tilts.length] * land}deg)`,
    background: `color-mix(in srgb, white ${100 - tone}%, #8a9099)`,
  };
}

const pad = (i: number) => String(i + 1).padStart(2, '0');
const letter = (title: string) => Array.from(title.trim())[0]?.toLowerCase() ?? 'a';
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div class="rounded-[2rem] bg-dark px-4 pb-16 text-white @3xl:rounded-card @3xl:px-10 @3xl:pb-24">
      <h2
        v-if="p.title || editing"
        class="top-0 z-0 pb-10 pt-10 text-center text-[clamp(3rem,10cqw,8.5rem)] font-medium uppercase leading-none tracking-tight @3xl:pt-14"
        :class="stacked ? 'sticky' : ''"
      >
        <EditableText :value="p.title" path="title" placeholder="Title" />
      </h2>

      <div class="mx-auto max-w-4xl" :class="stacked ? 'pb-[20vh]' : 'space-y-6'">
        <div
          v-for="(service, i) in p.services"
          :key="i"
          :ref="(el) => el && (cardEls[i] = el as HTMLElement)"
          :class="stacked ? 'sticky mb-[40vh] last:mb-0' : ''"
          :style="stacked ? { top: `calc(clamp(8rem, 22cqw, 13rem) + ${i * 0.4}rem)` } : undefined"
        >
          <article
            class="relative flex min-h-[24rem] flex-col overflow-hidden rounded-[1.75rem] bg-white p-7 text-dark shadow-[0_-10px_40px_rgb(0_0_0/0.25)] will-change-transform @3xl:min-h-[28rem] @3xl:p-11"
            :style="cardStyle(i)"
          >
            <!-- A light drawing on the end side -->
            <svg
              v-if="service.drawing !== 'none'"
              class="pointer-events-none absolute -end-10 bottom-0 h-[55%] w-auto text-[#9aa0a8] opacity-40 @3xl:end-6 @3xl:h-[72%] @3xl:opacity-70"
              viewBox="0 0 300 300"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <template v-if="service.drawing === 'nodes'">
                <rect x="40" y="50" width="110" height="60" fill="#e9eaec" />
                <rect x="150" y="170" width="110" height="60" fill="#e9eaec" />
                <path d="M95 110 V200 H150 M0 30 H300" />
                <rect
                  v-for="[x, y] in [
                    [36, 46],
                    [146, 46],
                    [36, 106],
                    [146, 106],
                    [91, 106],
                    [146, 166],
                    [256, 166],
                    [146, 226],
                    [256, 226],
                  ]"
                  :key="`${x}-${y}`"
                  :x="x"
                  :y="y"
                  width="8"
                  height="8"
                  fill="white"
                />
              </template>
              <template v-else-if="service.drawing === 'letter'">
                <text x="150" y="250" text-anchor="middle" font-size="300" font-weight="500" fill="#e4e5e8" stroke-width="1.2">
                  {{ letter(service.title) }}
                </text>
                <path d="M0 40 H300 M0 262 H300" />
              </template>
              <template v-else-if="service.drawing === 'orbit'">
                <circle cx="150" cy="160" r="85" fill="#d9dbde" fill-opacity="0.6" />
                <ellipse cx="150" cy="160" rx="145" ry="42" transform="rotate(-14 150 160)" />
                <circle cx="272" cy="118" r="16" fill="#d9dbde" />
                <circle cx="150" cy="160" r="3" fill="white" stroke="none" />
              </template>
              <template v-else>
                <circle cx="110" cy="150" r="80" fill="#e9eaec" fill-opacity="0.7" />
                <circle cx="190" cy="150" r="80" />
                <circle cx="150" cy="90" r="45" />
              </template>
            </svg>

            <span class="relative text-xs font-bold tabular-nums text-primary">{{ pad(i) }}</span>
            <h3 class="relative mt-3 text-3xl font-medium tracking-tight @3xl:text-5xl">
              <EditableText :value="service.title" :path="`services.${i}.title`" placeholder="Title" />
            </h3>
            <p
              class="relative mt-5 max-w-xl text-sm @3xl:max-w-[55%] leading-relaxed text-[color-mix(in_srgb,var(--c-dark)_72%,transparent)] @3xl:text-base"
            >
              <EditableText :value="service.text" :path="`services.${i}.text`" multiline />
            </p>
            <a
              v-if="service.buttonLabel || editing"
              :href="editing ? undefined : resolveHref(service.buttonLink, locale)"
              class="relative mt-auto w-fit rounded-full bg-dark px-5 py-2.5 text-base text-white transition hover:scale-105"
            >
              <EditableText :value="service.buttonLabel" :path="`services.${i}.buttonLabel`" placeholder="Button" />
            </a>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
