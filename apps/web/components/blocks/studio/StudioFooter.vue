<script setup lang="ts">
/**
 * The awakeagency.dev footer: a dark panel with the name, two columns of links, an email that is copied with one
 * click (with a short "copied" note), the city with its live local time, and the copyright and small links.
 */
import EditableText from '../../site/EditableText.vue';

interface Link {
  label: string;
  link: string;
}

const props = defineProps<{
  p: {
    name: string;
    logo: string;
    links: Link[];
    social: Link[];
    emailLabel: string;
    email: string;
    copiedText: string;
    placeLabel: string;
    city: string;
    timeZone: string;
    copyright: string;
    legal: Link[];
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const time = useLocalClock(
  () => props.p.timeZone,
  () => props.locale,
);

const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
async function copy() {
  if (editing) return;
  try {
    await navigator.clipboard.writeText(props.p.email);
    copied.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => (copied.value = false), 2000);
  } catch {
    window.location.href = `mailto:${props.p.email}`;
  }
}
onBeforeUnmount(() => clearTimeout(timer));

const href = (link: string) => (editing ? undefined : resolveHref(link, props.locale));
const external = (link: string) => /^https?:/i.test(link);
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div class="flex min-h-[26rem] flex-col gap-14 rounded-[2rem] bg-dark px-6 py-10 text-white @3xl:rounded-card @3xl:px-10 @3xl:py-12">
      <div class="grid gap-10 @xl:grid-cols-2 @5xl:grid-cols-[2fr_1fr_1fr_1.4fr]">
        <a :href="href(`/${locale}`)" class="w-fit text-4xl font-medium tracking-tight @3xl:text-[2.6rem]">
          <img v-if="p.logo" :src="p.logo" :alt="p.name" class="h-10 w-auto" style="filter: brightness(0) invert(1)" />
          <EditableText v-else :value="p.name" path="name" placeholder="Name" />
        </a>

        <nav v-for="key in ['links', 'social'] as const" :key="key" class="flex flex-col items-start gap-3 text-lg">
          <a
            v-for="(item, i) in p[key]"
            :key="i"
            :href="href(item.link)"
            :target="external(item.link) ? '_blank' : undefined"
            :rel="external(item.link) ? 'noopener' : undefined"
            class="transition-opacity hover:opacity-60"
          >
            <EditableText :value="item.label" :path="`${key}.${i}.label`" placeholder="Link" />
          </a>
        </nav>

        <div class="space-y-8 text-lg @5xl:justify-self-end">
          <div v-if="p.email || editing">
            <p class="text-sm opacity-50"><EditableText :value="p.emailLabel" path="emailLabel" placeholder="Contact us" /></p>
            <button type="button" class="group relative text-start" dir="ltr" @click="copy">
              <EditableText :value="p.email" path="email" placeholder="hello@example.com" />
              <i class="mdi mdi-content-copy ms-2 text-sm opacity-0 transition-opacity group-hover:opacity-60" aria-hidden="true" />
            </button>
            <p class="h-5 text-xs text-secondary transition-opacity" :class="copied ? 'opacity-100' : 'opacity-0'" aria-live="polite">
              {{ copied ? p.copiedText : '' }}
            </p>
          </div>
          <div v-if="p.city || editing">
            <p class="text-sm opacity-50"><EditableText :value="p.placeLabel" path="placeLabel" placeholder="Based in" /></p>
            <p>
              <EditableText :value="p.city" path="city" placeholder="City" />
              <span v-if="time" class="tabular-nums"> · {{ time }}</span>
            </p>
          </div>
        </div>
      </div>

      <div class="mt-auto flex flex-wrap items-end justify-between gap-x-10 gap-y-4 text-sm">
        <p class="opacity-70"><EditableText :value="p.copyright" path="copyright" placeholder="©" /></p>
        <nav class="flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-wider @5xl:me-auto @5xl:ms-[22%]">
          <a v-for="(item, i) in p.legal" :key="i" :href="href(item.link)" class="opacity-60 transition-opacity hover:opacity-100">
            <EditableText :value="item.label" :path="`legal.${i}.label`" placeholder="Link" />
          </a>
        </nav>
      </div>
    </div>
  </section>
</template>
