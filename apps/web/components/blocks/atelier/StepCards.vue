<script setup lang="ts">
/**
 * The whitecotton.pt "how to start": a two-tone title with a short note at the end side, then white step cards side
 * by side (two per row on tablets, one on phones). Each card has its step label, a title and text, and under a thin
 * line a small detail and a spaced-out link. A line with a link closes it.
 */
import EditableText from '../../site/EditableText.vue';
import AtelierHeading from './AtelierHeading.vue';

interface Step {
  label: string;
  title: string;
  text: string;
  detail: string;
  detailNote: string;
  linkLabel: string;
  link: string;
}

const props = defineProps<{
  p: {
    eyebrow: string;
    title: string;
    titleItalic: string;
    note: string;
    steps: Step[];
    footnote: string;
    footnoteLabel: string;
    footnoteLink: string;
  };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const href = (link: string) => (link && !editing ? resolveHref(link, props.locale) : undefined);
const columns = computed(() => (props.p.steps.length >= 4 ? '@5xl:grid-cols-4' : props.p.steps.length === 3 ? '@5xl:grid-cols-3' : ''));
</script>

<template>
  <section class="atelier-paper px-6 py-20 text-ink @3xl:px-14 @3xl:py-28">
    <div class="mx-auto max-w-6xl">
      <div class="flex flex-col gap-6 @3xl:flex-row @3xl:items-end @3xl:justify-between">
        <div v-reveal><AtelierHeading :p="p" /></div>
        <p v-if="p.note || editing" class="max-w-xs whitespace-pre-line text-sm leading-relaxed text-muted @3xl:text-end">
          <EditableText :value="p.note" path="note" multiline placeholder="Note" />
        </p>
      </div>

      <div class="mt-12 grid gap-4 @2xl:grid-cols-2 @3xl:mt-16" :class="columns">
        <article
          v-for="(step, i) in p.steps"
          :key="i"
          v-reveal="{ delay: i * 90 }"
          class="flex flex-col rounded-[1.25rem] border border-black/5 bg-white/80 p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_40px_-24px_rgb(60_40_20/0.35)] backdrop-blur transition hover:-translate-y-1 @3xl:p-7"
        >
          <p class="text-[0.65rem] font-medium uppercase tracking-[0.3em] text-muted">
            <EditableText :value="step.label" :path="`steps.${i}.label`" placeholder="Step" />
          </p>
          <h3 class="mt-5 text-2xl font-medium leading-tight tracking-tight">
            <EditableText :value="step.title" :path="`steps.${i}.title`" placeholder="Title" />
          </h3>
          <p class="mt-3 whitespace-pre-line text-[0.8rem] leading-relaxed text-muted">
            <EditableText :value="step.text" :path="`steps.${i}.text`" multiline placeholder="Text" />
          </p>
          <div class="mt-auto pt-8">
            <div class="border-t border-black/10 pt-5">
              <p v-if="step.detail || editing" class="text-sm">
                <EditableText :value="step.detail" :path="`steps.${i}.detail`" placeholder="Detail" />
              </p>
              <p v-if="step.detailNote || editing" class="mt-1 text-[0.6rem] uppercase tracking-[0.25em] text-muted">
                <EditableText :value="step.detailNote" :path="`steps.${i}.detailNote`" placeholder="Under the detail" />
              </p>
              <component
                :is="href(step.link) ? 'a' : 'span'"
                v-if="step.linkLabel || editing"
                :href="href(step.link)"
                class="mt-5 inline-flex items-center gap-2 text-[0.6rem] font-medium uppercase tracking-[0.25em] text-muted transition hover:text-primary"
              >
                <EditableText :value="step.linkLabel" :path="`steps.${i}.linkLabel`" placeholder="Link" />
                <i class="mdi mdi-arrow-right rtl:rotate-180" />
              </component>
            </div>
          </div>
        </article>
      </div>

      <p v-if="p.footnote || p.footnoteLabel || editing" class="mt-10 text-center text-sm text-muted">
        <EditableText :value="p.footnote" path="footnote" placeholder="Line" />
        {{ ' ' }}
        <component
          :is="href(p.footnoteLink) ? 'a' : 'span'"
          :href="href(p.footnoteLink)"
          class="text-ink underline underline-offset-4 hover:text-primary"
        >
          <EditableText :value="p.footnoteLabel" path="footnoteLabel" placeholder="Link" />
        </component>
        <i v-if="p.footnoteLabel" class="mdi mdi-arrow-right ms-1 text-ink rtl:rotate-180" />
      </p>
    </div>
  </section>
</template>
