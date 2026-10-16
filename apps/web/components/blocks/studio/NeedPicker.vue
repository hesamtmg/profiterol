<script setup lang="ts">
/**
 * "I need [development] next →" in huge type on a loud panel. The choices sit on a wheel of pills that turns by
 * itself until the visitor points at it or picks one (click, or the arrow keys); the button goes to the chosen
 * choice's link. In the editor the choices are listed one under another so each can be edited.
 */
import EditableText from '../../site/EditableText.vue';

interface Option {
  label: string;
  link: string;
}

const props = defineProps<{ p: { lead: string; options: Option[]; buttonLabel: string; look: string }; locale: string }>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const active = ref(0);
const paused = ref(false);
const n = computed(() => Math.max(1, props.p.options.length));

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  timer = setInterval(() => {
    if (!paused.value && !reduced.value && !editing) active.value = (active.value + 1) % n.value;
  }, 2200);
});
onBeforeUnmount(() => clearInterval(timer));

/** Where choice `i` sits on the wheel relative to the chosen one, wrapping round: -1 above, 1 below. */
function offset(i: number) {
  let d = (i - active.value) % n.value;
  if (d > n.value / 2) d -= n.value;
  if (d < -n.value / 2) d += n.value;
  return d;
}

function pick(i: number) {
  active.value = i;
  paused.value = true;
}

function onKey(e: KeyboardEvent) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  pick((active.value + (e.key === 'ArrowDown' ? 1 : -1) + n.value) % n.value);
}

const colors = computed(() =>
  props.p.look === 'dark' ? 'bg-dark text-white' : props.p.look === 'light' ? 'bg-surface text-ink' : 'bg-primary text-white',
);
/** The chosen pill is filled with the text color, its text the panel's color. */
const fill = computed(() =>
  props.p.look === 'light' ? 'bg-[var(--c-text)] text-surface' : props.p.look === 'dark' ? 'bg-white text-dark' : 'bg-white text-primary',
);
/** The wheel is as wide as its longest choice (about 0.62em a letter, plus the pill's padding). */
const wheelWidth = computed(() => `${Math.max(...props.p.options.map((o) => Array.from(o.label).length), 3) * 0.62 + 1.2}em`);
const href = computed(() => resolveHref(props.p.options[active.value]?.link ?? '', props.locale));
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div
      class="relative flex min-h-[70vh] flex-col items-center justify-center gap-6 overflow-hidden rounded-[2rem] px-6 py-20 text-[clamp(2rem,5.4cqw,5.75rem)] font-medium leading-none @3xl:flex-row @3xl:gap-[0.4em] @3xl:rounded-card"
      :class="colors"
    >
      <p class="shrink-0"><EditableText :value="p.lead" path="lead" placeholder="I need" /></p>

      <!-- The wheel -->
      <div v-if="editing" class="flex flex-col items-center gap-3">
        <span
          v-for="(option, i) in p.options"
          :key="i"
          class="rounded-full px-[0.45em] pb-[0.18em] pt-[0.12em]"
          :class="i === 0 ? fill : 'border-[0.06em] border-current'"
        >
          <EditableText :value="option.label" :path="`options.${i}.label`" placeholder="Choice" />
        </span>
      </div>
      <div
        v-else
        class="relative h-[4.4em] max-w-full shrink-0 [mask-image:linear-gradient(transparent,black_30%,black_70%,transparent)] @3xl:h-[4.8em]"
        :style="{ width: wheelWidth }"
        role="radiogroup"
        :aria-label="p.lead"
        tabindex="0"
        @pointerenter="paused = true"
        @focusin="paused = true"
        @keydown="onKey"
      >
        <button
          v-for="(option, i) in p.options"
          :key="i"
          type="button"
          role="radio"
          tabindex="-1"
          :aria-checked="i === active"
          class="absolute left-1/2 top-1/2 whitespace-nowrap rounded-full px-[0.45em] pb-[0.18em] pt-[0.12em] transition-[transform,opacity,background-color,color] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          :class="i === active ? fill : 'border-[0.06em] border-current'"
          :style="{
            transform: `translate(-50%, calc(-50% + ${offset(i) * 1.55}em))`,
            opacity: Math.abs(offset(i)) > 1.5 ? 0 : 1,
          }"
          @click="pick(i)"
        >
          {{ option.label }}
        </button>
      </div>

      <a
        v-if="p.buttonLabel || editing"
        :href="editing ? undefined : href"
        class="group flex shrink-0 items-center gap-[0.3em] rounded-full px-[0.45em] pb-[0.18em] pt-[0.12em] transition hover:scale-105"
        :class="fill"
      >
        <EditableText :value="p.buttonLabel" path="buttonLabel" placeholder="next" />
        <i class="mdi mdi-arrow-right text-[0.8em] transition-transform group-hover:translate-x-1 rtl:-scale-x-100" aria-hidden="true" />
      </a>
    </div>
  </section>
</template>
