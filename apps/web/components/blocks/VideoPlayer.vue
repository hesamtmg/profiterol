<script setup lang="ts">
/** An uploaded video, or an embedded YouTube / Aparat player. */
import { videoEmbedUrl } from '@profiterol/blocks';
import EditableText from '../site/EditableText.vue';

const props = defineProps<{ p: { title: string; video: string; link: string; poster: string; caption: string } }>();
const editing = Boolean(useBlockEditing());
const embed = computed(() => (props.p.link ? videoEmbedUrl(props.p.link) : null));
</script>

<template>
  <section v-if="embed || p.video || editing" class="px-3 py-3 @3xl:px-6">
    <div class="panel px-4 py-8 @3xl:px-20 @3xl:py-16">
      <h2 v-if="p.title || editing" class="mb-6 px-2 text-2xl font-black @3xl:text-4xl">
        <EditableText :value="p.title" path="title" placeholder="Title" />
      </h2>
      <div class="aspect-video overflow-hidden rounded-[1.5rem] bg-dark @3xl:rounded-[2.5rem]">
        <iframe
          v-if="embed"
          :src="embed"
          :title="p.title || 'Video'"
          class="h-full w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        />
        <video
          v-else-if="p.video"
          :src="p.video"
          :poster="p.poster || undefined"
          controls
          preload="metadata"
          class="h-full w-full object-contain"
        />
        <div v-else class="flex h-full flex-col items-center justify-center gap-2 text-sm text-white/70" dir="ltr">
          <i class="mdi mdi-play-circle-outline text-5xl" />
          {{
            p.link ? 'Only YouTube and Aparat links can be shown here.' : 'Upload a video or paste a YouTube / Aparat link in the panel.'
          }}
        </div>
      </div>
      <p v-if="p.caption || editing" class="mt-4 px-2 text-sm font-extralight text-muted">
        <EditableText :value="p.caption" path="caption" placeholder="Caption" />
      </p>
    </div>
  </section>
</template>
