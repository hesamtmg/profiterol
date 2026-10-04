<script setup lang="ts">
import type { MediaItem } from '~/composables/useAdminTypes';

const emit = defineEmits<{ pick: [url: string]; close: [] }>();
const api = useApi();
const items = ref<MediaItem[]>([]);
const uploading = ref(false);
const error = ref('');

async function load() {
  items.value = await api<MediaItem[]>('/admin/media');
}

async function upload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = true;
  error.value = '';
  try {
    const body = new FormData();
    body.append('file', file);
    const item = await api<MediaItem>('/admin/media', { method: 'POST', body });
    emit('pick', item.url);
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    uploading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" @click.self="emit('close')">
    <div class="admin-ui flex max-h-[80vh] w-full max-w-3xl flex-col rounded-[2rem] bg-white shadow-2xl">
      <div class="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <h3 class="text-lg font-black">Media library</h3>
        <label class="btn-dark ms-auto cursor-pointer">
          <i class="mdi mdi-upload" /> {{ uploading ? 'Uploading…' : 'Upload' }}
          <input type="file" class="hidden" accept="image/*,video/mp4,video/webm" :disabled="uploading" @change="upload" />
        </label>
        <button type="button" class="btn-icon" @click="emit('close')"><i class="mdi mdi-close text-lg" /></button>
      </div>
      <p v-if="error" class="mx-6 mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
      <div class="grid grid-cols-3 gap-3 overflow-y-auto p-6 sm:grid-cols-4">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="group aspect-square overflow-hidden rounded-2xl bg-slate-100 ring-offset-2 hover:ring-2 hover:ring-slate-900"
          :title="item.originalName"
          @click="emit('pick', item.url)"
        >
          <img v-if="item.mime.startsWith('image/')" :src="item.url" :alt="item.originalName" class="h-full w-full object-cover" />
          <span v-else class="flex h-full items-center justify-center text-3xl text-slate-400"><i class="mdi mdi-video-outline" /></span>
        </button>
        <p v-if="!items.length" class="col-span-full py-10 text-center text-sm text-slate-400">No files yet. Upload one to get started.</p>
      </div>
    </div>
  </div>
</template>
