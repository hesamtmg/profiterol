<script setup lang="ts">
/**
 * Tall photo panels side by side (stacked on phones). The one pointed at, focused or tapped widens and shows
 * its text; the others narrow to strips. On touch screens the first tap opens a panel and the second follows
 * its link. Visitors who turn off motion get the same panels without the sliding.
 */
import EditableText from '../../site/EditableText.vue';

interface Panel {
  image: string;
  title: string;
  text: string;
  link: string;
}

const props = defineProps<{ p: { title: string; panels: Panel[] }; locale: string }>();
const editing = Boolean(useBlockEditing());
const active = ref(0);

watch(
  () => props.p.panels?.length ?? 0,
  (n) => {
    if (active.value >= n) active.value = 0;
  },
);

function onClick(i: number, e: MouseEvent) {
  if (active.value === i) return;
  e.preventDefault();
  active.value = i;
}
function onEnter(i: number, e: PointerEvent) {
  if (e.pointerType === 'mouse') active.value = i;
}
</script>

<template>
  <section class="bg-surface px-4 py-20 text-ink @3xl:px-16 @3xl:py-28">
    <div class="mx-auto max-w-7xl">
      <h2 v-if="p.title || editing" class="mb-10 text-center text-3xl font-black @3xl:mb-14 @3xl:text-5xl">
        <EditableText :value="p.title" path="title" placeholder="Title" />
      </h2>
      <div class="flex flex-col gap-3 @3xl:h-[70vh] @3xl:min-h-[460px] @3xl:flex-row">
        <component
          :is="panel.link && !editing ? 'a' : 'article'"
          v-for="(panel, i) in p.panels"
          :key="i"
          :href="panel.link && !editing ? resolveHref(panel.link, locale) : undefined"
          :tabindex="panel.link && !editing ? undefined : 0"
          :aria-expanded="active === i"
          class="group relative min-w-0 overflow-hidden rounded-[1.75rem] bg-dark text-white outline-none transition-all duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] focus-visible:ring-4 focus-visible:ring-primary motion-reduce:transition-none @3xl:h-auto"
          :class="active === i ? 'h-80 @3xl:flex-[5_1_0%]' : 'h-20 cursor-pointer @3xl:flex-[1_1_0%]'"
          @pointerenter="onEnter(i, $event)"
          @focus="active = i"
          @click="onClick(i, $event)"
        >
          <img
            v-if="panel.image"
            :src="panel.image"
            :alt="panel.title"
            class="absolute inset-0 h-full w-full object-cover transition duration-700 motion-reduce:transition-none"
            :class="active === i ? 'scale-100' : 'scale-110 brightness-75'"
            loading="lazy"
          />
          <div v-else class="photo-placeholder absolute inset-0" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

          <div class="absolute inset-x-0 bottom-0 p-5 @3xl:p-8">
            <h3
              class="font-bold leading-tight transition-all duration-500 motion-reduce:transition-none"
              :class="active === i ? 'text-2xl @3xl:text-4xl' : 'truncate text-lg @3xl:text-base @3xl:opacity-80'"
            >
              <EditableText :value="panel.title" :path="`panels.${i}.title`" placeholder="Title" />
            </h3>
            <div
              class="grid transition-all duration-500 motion-reduce:transition-none"
              :class="active === i ? 'grid-rows-[1fr] opacity-100 delay-200' : 'grid-rows-[0fr] opacity-0'"
            >
              <div class="overflow-hidden">
                <p v-if="panel.text || editing" class="mt-3 max-w-md font-light opacity-90">
                  <EditableText :value="panel.text" :path="`panels.${i}.text`" multiline />
                </p>
                <span v-if="panel.link" class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  <i class="mdi mdi-arrow-right text-lg rtl:rotate-180" />
                </span>
              </div>
            </div>
          </div>
        </component>
      </div>
    </div>
  </section>
</template>
