<script setup lang="ts">
import type { MediaItem } from '~/composables/useAdminTypes';

definePageMeta({ layout: 'admin', middleware: 'admin' });

const api = useApi();
const items = ref<MediaItem[]>([]);
const uploading = ref(false);
const error = ref('');
const copied = ref<string | null>(null);

async function load() {
  items.value = await api<MediaItem[]>('/admin/media');
}

async function upload(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  uploading.value = true;
  error.value = '';
  for (const file of files) {
    try {
      const body = new FormData();
      body.append('file', file);
      items.value.unshift(await api<MediaItem>('/admin/media', { method: 'POST', body }));
    } catch (err) {
      error.value = `${file.name}: ${apiErrorMessage(err)}`;
    }
  }
  uploading.value = false;
  input.value = '';
}

async function remove(item: MediaItem) {
  if (!confirm(`Delete ${item.originalName}? Pages that use it will show an empty image.`)) return;
  await api(`/admin/media/${item.id}`, { method: 'DELETE' });
  items.value = items.value.filter((i) => i.id !== item.id);
}

async function copy(item: MediaItem) {
  await navigator.clipboard?.writeText(item.url);
  copied.value = item.id;
  setTimeout(() => (copied.value = null), 1500);
}

function size(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black">Media</h1>
        <p class="mt-1 text-sm font-light text-slate-500">JPG, PNG, WebP, GIF, AVIF, MP4 and WebM, up to 20 MB each.</p>
      </div>
      <label class="btn-dark cursor-pointer">
        <i class="mdi mdi-upload" /> {{ uploading ? 'Uploading…' : 'Upload files' }}
        <input type="file" multiple class="hidden" accept="image/*,video/mp4,video/webm" :disabled="uploading" @change="upload" />
      </label>
    </div>
    <p v-if="error" class="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>

    <div class="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
      <div
        v-for="item in items"
        :key="item.id"
        class="group overflow-hidden rounded-[1.75rem] bg-white shadow-sm ring-1 ring-slate-200/60 transition hover:-translate-y-1 hover:shadow-xl"
      >
        <div class="aspect-square bg-slate-100">
          <img v-if="item.mime.startsWith('image/')" :src="item.url" :alt="item.originalName" loading="lazy" class="h-full w-full object-cover" />
          <video v-else :src="item.url" class="h-full w-full object-cover" muted />
        </div>
        <div class="flex items-center gap-1 p-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-medium" :title="item.originalName">{{ item.originalName }}</p>
            <p class="text-[11px] text-slate-400">{{ size(item.size) }}</p>
          </div>
          <button type="button" class="btn-icon" :title="copied === item.id ? 'Copied' : 'Copy URL'" @click="copy(item)">
            <i class="mdi" :class="copied === item.id ? 'mdi-check text-emerald-600' : 'mdi-link-variant'" />
          </button>
          <button type="button" class="btn-icon hover:!text-red-600" title="Delete" @click="remove(item)">
            <i class="mdi mdi-trash-can-outline" />
          </button>
        </div>
      </div>
    </div>
    <p v-if="!items.length" class="mt-16 text-center text-sm text-slate-400">No files yet.</p>
  </div>
</template>
