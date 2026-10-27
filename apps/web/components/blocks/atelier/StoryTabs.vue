<script setup lang="ts">
/**
 * The whitecotton.pt "our story": a two-tone title over a short rule and small links on one side; on the other, pill
 * tabs (roots, craft, promise…), each telling its part of the story in large type that settles in word by word.
 */
import EditableText from '../../site/EditableText.vue';
import AtelierHeading from './AtelierHeading.vue';

interface Tab {
  label: string;
  text: string;
}

const props = defineProps<{
  p: { eyebrow: string; title: string; titleItalic: string; links: { label: string; link: string }[]; tabs: Tab[] };
  locale: string;
}>();
const editing = Boolean(useBlockEditing());
const href = (link: string) => (link && !editing ? resolveHref(link, props.locale) : undefined);
const active = ref(0);
const tab = computed(() => props.p.tabs[Math.min(active.value, props.p.tabs.length - 1)]);
const words = computed(() => (tab.value?.text ?? '').split(/(\s+)/));
</script>

<template>
  <section class="atelier-paper px-6 py-20 text-ink @3xl:px-14 @3xl:py-32">
    <div class="mx-auto grid max-w-6xl gap-12 @3xl:grid-cols-[2fr_3fr] @3xl:gap-16">
      <div v-reveal>
        <AtelierHeading :p="p" size="xl" />
        <div class="mt-8 h-px w-20 bg-black/15" />
        <ul v-if="p.links.length" class="mt-8 space-y-3">
          <li v-for="(l, i) in p.links" :key="i">
            <component
              :is="href(l.link) ? 'a' : 'span'"
              :href="href(l.link)"
              class="inline-flex items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.25em] hover:text-primary"
            >
              <EditableText :value="l.label" :path="`links.${i}.label`" placeholder="Link" />
              <i class="mdi mdi-arrow-right rtl:rotate-180" />
            </component>
          </li>
        </ul>
      </div>

      <div>
        <div v-if="p.tabs.length > 1" class="flex flex-wrap gap-2" role="tablist">
          <button
            v-for="(t, i) in p.tabs"
            :key="i"
            type="button"
            role="tab"
            :aria-selected="active === i"
            class="rounded-full border px-4 py-1.5 text-[0.6rem] font-medium uppercase tracking-[0.25em] transition"
            :class="active === i ? 'border-dark bg-dark text-white' : 'border-black/10 bg-white/60 text-muted hover:text-ink'"
            @click="active = i"
          >
            {{ t.label }}
          </button>
        </div>
        <!-- In the editor the active tab's text can be typed into; for visitors it settles in word by word. -->
        <p v-if="editing && tab" class="mt-8 whitespace-pre-line text-xl font-medium leading-relaxed @3xl:text-2xl">
          <EditableText :value="tab.text" :path="`tabs.${active}.text`" multiline placeholder="Story" />
        </p>
        <p v-else-if="tab" :key="active" class="mt-8 whitespace-pre-line text-xl font-medium leading-relaxed @3xl:text-2xl">
          <span v-for="(w, i) in words" :key="i" class="story-word" :style="{ animationDelay: `${Math.min(i, 120) * 12}ms` }">{{ w }}</span>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.story-word {
  animation: story-in 0.6s ease-out both;
}
@keyframes story-in {
  from {
    opacity: 0.08;
    filter: blur(3px);
  }
  to {
    opacity: 1;
    filter: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .story-word {
    animation: none;
  }
}
</style>
