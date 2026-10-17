<script setup lang="ts">
/**
 * The undplus.com project list: a huge title stays in the middle of the screen while the project pictures scroll past
 * it, small and medium ones taking turns at either side, wide ones across the page. The title inverts its color over
 * the pictures. At the end, a link inside a spinning starburst.
 */
import EditableText from '../../site/EditableText.vue';
import SpatialShape from './SpatialShape.vue';

interface Project {
  image: string;
  title: string;
  tags: string;
  size: string;
  link: string;
}

const props = defineProps<{ p: { title: string; projects: Project[]; buttonLabel: string; buttonLink: string }; locale: string }>();
const editing = Boolean(useBlockEditing());

const width = (size: string) => (size === 'wide' ? '@3xl:w-full' : size === 'small' ? '@3xl:w-[37%]' : '@3xl:w-[47%]');
const ratio = (size: string) => (size === 'wide' ? 'aspect-[4/3] @3xl:aspect-[13/6]' : size === 'small' ? 'aspect-[4/3]' : 'aspect-[7/6]');

/** Which side each project sits on: wide ones span the page; the others alternate, counted between wide ones. */
const sides = computed(() => {
  let n = 0;
  return props.p.projects.map((project) => {
    if (project.size === 'wide') {
      n = 0;
      return 'wide';
    }
    return n++ % 2 ? 'end' : 'start';
  });
});
const href = (link: string) => (link && !editing ? resolveHref(link, props.locale) : undefined);
</script>

<template>
  <section class="relative isolate bg-surface px-5 pb-24 pt-10 text-ink @3xl:px-10 @3xl:pb-36">
    <!-- The title sticks to the middle of the screen; the pictures pass under it -->
    <div class="sticky top-[45svh] z-20 h-0" :class="editing ? '' : 'pointer-events-none'">
      <h2
        class="-translate-y-1/2 whitespace-nowrap text-center text-[clamp(3rem,12cqw,11rem)] font-bold uppercase leading-none tracking-tight text-white mix-blend-difference"
      >
        <EditableText :value="p.title" path="title" placeholder="Title" />
      </h2>
    </div>

    <div class="flex flex-col gap-16 pt-[28svh] @3xl:flex-row @3xl:flex-wrap @3xl:items-start @3xl:justify-between @3xl:gap-y-24">
      <component
        :is="href(project.link) ? 'a' : 'div'"
        v-for="(project, i) in p.projects"
        :key="i"
        v-reveal="{ delay: sides[i] === 'end' ? 120 : 0 }"
        :href="href(project.link)"
        class="group block w-full"
        :class="[width(project.size), sides[i] === 'end' ? '@3xl:ms-auto' : '']"
      >
        <div class="overflow-hidden" :class="ratio(project.size)">
          <img
            v-if="project.image"
            :src="project.image"
            :alt="project.title"
            class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div v-else class="photo-placeholder h-full w-full transition-transform duration-700 group-hover:scale-105" />
        </div>
        <h3 class="mt-4 text-xl font-medium uppercase @3xl:text-2xl">
          <EditableText :value="project.title" :path="`projects.${i}.title`" placeholder="Name" />
        </h3>
        <p class="mt-1 whitespace-pre-line text-base leading-relaxed text-muted @3xl:text-lg">
          <EditableText :value="project.tags" :path="`projects.${i}.tags`" multiline placeholder="Kind of work" />
        </p>
      </component>
    </div>

    <div v-if="p.buttonLabel || editing" class="mt-24 flex justify-center">
      <component
        :is="href(p.buttonLink) ? 'a' : 'span'"
        :href="href(p.buttonLink)"
        class="group relative flex h-40 w-40 items-center justify-center text-base font-medium @3xl:h-48 @3xl:w-48"
      >
        <span class="absolute inset-0 text-primary transition-transform duration-500 group-hover:scale-110">
          <SpatialShape shape="burst" :spin="!editing" :seconds="20" />
        </span>
        <span class="relative underline underline-offset-4">
          <EditableText :value="p.buttonLabel" path="buttonLabel" placeholder="Button" />
        </span>
      </component>
    </div>
  </section>
</template>
