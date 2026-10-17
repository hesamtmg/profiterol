<script setup lang="ts">
/**
 * The mikewilcockdesign.com footer: a small question, then huge condensed words that rise in when they come on
 * screen and lead to the email (or another link), then one line with the email, profile links, the city with its
 * live local time and a "back to top" link.
 */
import EditableText from '../../site/EditableText.vue';
import { folioColors, folioLabel } from './look';

const props = defineProps<{
  p: {
    label: string;
    title: string;
    link: string;
    email: string;
    social: { label: string; link: string }[];
    city: string;
    timeZone: string;
    topLabel: string;
    look: string;
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const reduced = useReducedMotion();
const colors = computed(() => folioColors(props.p.look));
const time = useLocalClock(
  () => props.p.timeZone,
  () => props.locale,
);

const email = computed(() => String(props.p.email ?? '').trim());
const titleHref = computed(() => {
  if (editing) return undefined;
  if (props.p.link) return resolveHref(props.p.link, props.locale);
  return email.value ? `mailto:${email.value}` : undefined;
});

// The words rise once the footer comes on screen (shown straight away without scripts, motion or in the editor).
const root = ref<HTMLElement | null>(null);
const seen = ref(true);
onMounted(() => {
  if (editing || reduced.value || !root.value) return;
  const r = root.value.getBoundingClientRect();
  if (r.top < window.innerHeight) return;
  seen.value = false;
  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        seen.value = true;
        io.disconnect();
      }
    },
    { threshold: 0.25 },
  );
  io.observe(root.value);
  onBeforeUnmount(() => io.disconnect());
});

const title = ref<HTMLElement | null>(null);
const fit = useFitWidth(
  root,
  () => (title.value ? [title.value] : []),
  () => props.p.title,
);

function toTop(e: MouseEvent) {
  if (editing) return;
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: reduced.value ? 'auto' : 'smooth' });
}
</script>

<template>
  <footer ref="root" class="border-t px-5 pb-10 pt-24 @3xl:px-14 @3xl:pt-32" :class="[colors.panel, colors.line]">
    <p class="opacity-60" :class="folioLabel"><EditableText :value="p.label" path="label" placeholder="Question" /></p>

    <component
      :is="titleHref ? 'a' : 'div'"
      :href="titleHref"
      class="title mt-6 block overflow-hidden whitespace-nowrap pb-[0.03em] font-extrabold uppercase leading-[0.9] tracking-[-0.02em] rtl:pb-[0.12em] rtl:leading-[1.2] rtl:tracking-normal transition-colors duration-500 hover:text-primary"
      :style="{ fontSize: `calc(clamp(3rem, 17cqw, 17rem) * ${fit})` }"
    >
      <span ref="title" class="block transition-transform duration-1000 ease-out" :class="seen ? 'translate-y-0' : 'translate-y-full'">
        <EditableText :value="p.title" path="title" placeholder="Big words" />
      </span>
    </component>

    <div class="mt-14 flex flex-wrap items-center justify-between gap-x-10 gap-y-5" :class="folioLabel">
      <a v-if="email || editing" :href="editing ? undefined : `mailto:${email}`" class="transition-colors hover:text-primary">
        <EditableText :value="p.email" path="email" placeholder="Email" />
      </a>
      <span v-if="p.social.length" class="flex gap-6 opacity-60">
        <a
          v-for="(s, i) in p.social"
          :key="i"
          :href="editing ? undefined : resolveHref(s.link, locale)"
          target="_blank"
          rel="noopener"
          class="transition-opacity hover:opacity-100"
        >
          <EditableText :value="s.label" :path="`social.${i}.label`" placeholder="Link" />
        </a>
      </span>
      <span v-if="p.city || editing" class="opacity-60">
        <EditableText :value="p.city" path="city" placeholder="City" />
        <template v-if="time"
          >{{ ' ' }}<span class="ms-1 tabular-nums">{{ time }}</span></template
        >
      </span>
      <a v-if="p.topLabel || editing" href="#" class="opacity-60 transition-opacity hover:opacity-100" @click="toTop">
        <EditableText :value="p.topLabel" path="topLabel" placeholder="Back to top" />
      </a>
    </div>
  </footer>
</template>

<style scoped>
.title {
  font-stretch: 72%;
}
</style>
