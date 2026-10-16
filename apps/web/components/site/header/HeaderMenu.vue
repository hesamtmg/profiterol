<script setup lang="ts">
/**
 * The full-screen menu of awakeagency.dev: a panel in the main color that opens as a circle from the menu button,
 * a line drawing itself across it, big numbered links rising in one by one, and the email and profiles at the bottom.
 * Escape or the close button shuts it; the page behind does not scroll while it is open.
 */
import HeaderLogo from './HeaderLogo.vue';
import { rememberLocale, type HeaderNav } from './nav';

const props = defineProps<{ nav: HeaderNav; open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const fa = computed(() => props.nav.locale === 'fa');
const closeButton = ref<HTMLElement | null>(null);

watch(
  () => props.open,
  async (open) => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) {
      await nextTick();
      closeButton.value?.focus();
    }
  },
);

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close');
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  document.documentElement.style.overflow = '';
});

const pad = (i: number) => String(i).padStart(2, '0');
</script>

<template>
  <Transition name="menu" :duration="{ enter: 1000, leave: 600 }">
    <div v-if="open" class="fixed inset-0 z-50 p-3 @3xl:px-6" role="dialog" aria-modal="true" :aria-label="fa ? 'منو' : 'Menu'">
      <div
        class="menu-panel relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-primary px-3 pb-6 pt-6 text-white @3xl:rounded-card @3xl:px-10 @3xl:pb-10 @3xl:pt-10"
      >
        <svg
          class="menu-swirl pointer-events-none absolute -start-[15%] -top-[5%] h-[115%] w-auto text-white/15"
          viewBox="0 0 640 720"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M180 -20 L60 140 C220 220 260 160 200 300 C140 440 -40 600 120 720 M150 560 C 360 640 560 700 600 520 C 660 300 420 160 220 220"
            stroke="currentColor"
            stroke-width="34"
            stroke-linecap="round"
            stroke-linejoin="round"
            pathLength="1"
          />
        </svg>

        <div class="relative flex items-center justify-between gap-4">
          <HeaderLogo
            :nav="{ ...nav, light: true }"
            text-class="text-3xl font-medium tracking-tight @3xl:text-[2.6rem]"
            image-class="h-10"
          />
          <div class="flex items-center gap-2">
            <a
              v-if="nav.cta"
              :href="nav.cta.href"
              class="hidden rounded-full bg-white/20 px-6 py-2.5 text-lg leading-none transition hover:bg-white/30 @xl:block"
              @click="emit('close')"
            >
              {{ nav.cta.label }}
            </a>
            <button
              ref="closeButton"
              type="button"
              class="flex items-center gap-3 rounded-full bg-white px-6 py-2.5 text-lg leading-none text-primary transition hover:scale-105"
              @click="emit('close')"
            >
              {{ fa ? 'بستن.' : 'close.' }}
              <i class="mdi mdi-close text-xl leading-none" aria-hidden="true" />
            </button>
          </div>
        </div>

        <nav class="relative my-auto grid grid-cols-[auto_1fr] items-center gap-x-8 gap-y-3 self-end @3xl:gap-x-48 @3xl:gap-y-6">
          <template v-for="(link, i) in nav.links" :key="i">
            <span
              class="menu-link text-xs tabular-nums opacity-80 [writing-mode:vertical-rl]"
              :style="{ transitionDelay: `${200 + i * 70}ms` }"
            >
              {{ pad(i) }}
            </span>
            <a
              :href="link.href"
              class="menu-link block text-4xl font-medium uppercase leading-none hover:opacity-70 @3xl:text-6xl"
              :style="{ transitionDelay: `${200 + i * 70}ms` }"
              @click="emit('close')"
            >
              {{ link.label }}
            </a>
          </template>
        </nav>

        <div class="relative flex flex-wrap items-end justify-between gap-x-8 gap-y-3 text-sm uppercase">
          <p v-if="nav.email">
            <span class="opacity-70">{{ fa ? 'سلام کنید:' : 'Say hello:' }}</span>
            <a :href="`mailto:${nav.email}`" class="ms-1.5 hover:underline" dir="ltr">{{ nav.email }}</a>
          </p>
          <div class="ms-auto flex flex-wrap gap-x-8 gap-y-2">
            <a
              v-for="l in nav.languages"
              :key="l.code"
              :href="l.href"
              :lang="l.code"
              class="hover:underline"
              @click="rememberLocale(l.code)"
            >
              {{ l.label }}
            </a>
            <a v-for="s in nav.social" :key="s.href" :href="s.href" target="_blank" rel="noopener" class="hover:underline">{{ s.label }}</a>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Opens as a circle from the menu button's corner. */
.menu-panel {
  --from: calc(100% - 5rem) 3rem;
  clip-path: circle(150% at var(--from));
}
[dir='rtl'] .menu-panel {
  --from: 5rem 3rem;
}
.menu-swirl path {
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
}

.menu-enter-active .menu-panel,
.menu-leave-active .menu-panel {
  transition: clip-path 0.75s cubic-bezier(0.7, 0, 0.2, 1);
}
.menu-enter-from .menu-panel,
.menu-leave-to .menu-panel {
  clip-path: circle(0% at var(--from));
}
.menu-enter-active .menu-swirl path {
  transition: stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1) 0.15s;
}
.menu-enter-from .menu-swirl path {
  stroke-dashoffset: 1;
}
.menu-enter-active .menu-link {
  transition:
    opacity 0.6s,
    transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.menu-enter-from .menu-link {
  opacity: 0;
  transform: translateY(1.5rem);
}

@media (prefers-reduced-motion: reduce) {
  .menu-enter-active .menu-panel,
  .menu-leave-active .menu-panel,
  .menu-enter-active .menu-swirl path,
  .menu-enter-active .menu-link {
    transition: none;
  }
}
</style>
