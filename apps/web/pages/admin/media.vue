<script setup lang="ts">
import { locales } from '@profiterol/blocks';
import type { MediaItem } from '~/composables/useAdminTypes';

definePageMeta({ layout: 'admin', middleware: 'admin' });

const api = useApi();
const items = ref<MediaItem[]>([]);
const folders = ref<string[]>([]);
const loading = ref(true);
const uploading = ref(false);
const error = ref('');
const copied = ref<string | null>(null);

// Filters: words in the name or description, kind of file, and folder ('*' = every folder, '' = no folder).
const q = ref('');
const kind = ref<'' | 'image' | 'video' | 'font'>('');
const folder = ref('*');
const kinds = [
  { value: '', label: 'All', icon: 'mdi-view-grid-outline' },
  { value: 'image', label: 'Pictures', icon: 'mdi-image-outline' },
  { value: 'video', label: 'Videos', icon: 'mdi-movie-outline' },
  { value: 'font', label: 'Fonts', icon: 'mdi-format-font' },
] as const;

async function load() {
  loading.value = true;
  try {
    const query = { q: q.value || undefined, kind: kind.value || undefined, folder: folder.value === '*' ? undefined : folder.value };
    [items.value, folders.value] = await Promise.all([api<MediaItem[]>('/admin/media', { query }), api<string[]>('/admin/media/folders')]);
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(q, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(load, 250);
});
watch([kind, folder], load);

const dragOver = ref(false);

async function onDrop(e: DragEvent) {
  dragOver.value = false;
  await uploadFiles(Array.from(e.dataTransfer?.files ?? []));
}

async function upload(e: Event) {
  const input = e.target as HTMLInputElement;
  await uploadFiles(Array.from(input.files ?? []));
  input.value = '';
}

/** New files go into the folder being looked at. */
async function uploadFiles(files: File[]) {
  uploading.value = true;
  error.value = '';
  for (const file of files) {
    try {
      const body = new FormData();
      body.append('file', file);
      let item = await api<MediaItem>('/admin/media', { method: 'POST', body });
      if (folder.value !== '*' && folder.value)
        item = await api<MediaItem>(`/admin/media/${item.id}`, { method: 'PATCH', body: { folder: folder.value } });
      items.value.unshift({ ...item, usedIn: [] });
    } catch (err) {
      error.value = `${file.name}: ${apiErrorMessage(err)}`;
    }
  }
  uploading.value = false;
}

async function remove(item: MediaItem) {
  const used = item.usedIn?.length
    ? translate('{name} is used on: {places}. They will show an empty space instead. Delete it anyway?', {
        name: item.originalName,
        places: item.usedIn.map((u) => (u.kind === 'settings' ? translate('Site settings') : u.name)).join(', '),
      })
    : translate('Delete {name}? This cannot be undone.', { name: item.originalName });
  if (!confirm(used)) return;
  await api(`/admin/media/${item.id}`, { method: 'DELETE' });
  items.value = items.value.filter((i) => i.id !== item.id);
  if (open.value?.id === item.id) open.value = null;
}

async function copy(item: MediaItem) {
  await navigator.clipboard?.writeText(item.url);
  copied.value = item.id;
  setTimeout(() => (copied.value = null), 1500);
}

function size(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

// ---------- Details: name, folder, description per language, where it is used ----------

const open = ref<MediaItem | null>(null);
const draft = reactive({ originalName: '', folder: '', alt: {} as Record<string, string> });
const saving = ref(false);
const savedNote = ref(false);

function details(item: MediaItem) {
  open.value = item;
  Object.assign(draft, {
    originalName: item.originalName,
    folder: item.folder ?? '',
    alt: Object.fromEntries(locales.map((l) => [l.code, item.alt?.[l.code] ?? ''])),
  });
  savedNote.value = false;
}

async function saveDetails() {
  if (!open.value) return;
  saving.value = true;
  error.value = '';
  try {
    const updated = await api<MediaItem>(`/admin/media/${open.value.id}`, { method: 'PATCH', body: { ...draft } });
    Object.assign(open.value, { originalName: updated.originalName, folder: updated.folder, alt: updated.alt });
    if (updated.folder && !folders.value.includes(updated.folder)) folders.value = [...folders.value, updated.folder].sort();
    savedNote.value = true;
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    saving.value = false;
  }
}

function usageLink(u: NonNullable<MediaItem['usedIn']>[number]) {
  if (u.kind === 'page') return `/admin/pages/${u.id}`;
  if (u.kind === 'item') return `/admin/collections/${u.parent}/items/${u.id}`;
  return '/admin/settings';
}

const isImage = (m: MediaItem) => m.mime.startsWith('image/');
const isVideo = (m: MediaItem) => m.mime.startsWith('video/');

onMounted(load);
</script>

<template>
  <div
    class="min-h-[70vh] rounded-[2rem] transition"
    :class="{ 'bg-sky-50 ring-4 ring-sky-300': dragOver }"
    @dragover.prevent="dragOver = true"
    @dragleave.self="dragOver = false"
    @drop.prevent="onDrop"
  >
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black">{{ $t('Media') }}</h1>
        <p class="mt-1 text-sm font-light text-slate-500">
          {{ $t('JPG, PNG, WebP, GIF, AVIF, MP4 and WebM, up to 20 MB each. Drop files anywhere on this page to upload them.') }}
        </p>
      </div>
      <label class="btn-dark cursor-pointer">
        <i class="mdi mdi-upload" /> {{ $t(uploading ? 'Uploading…' : 'Upload files') }}
        <input type="file" multiple class="hidden" accept="image/*,video/mp4,video/webm" :disabled="uploading" @change="upload" />
      </label>
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <div class="relative min-w-56 flex-1">
        <i class="mdi mdi-magnify absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          v-model="q"
          type="search"
          class="input !ps-9"
          :placeholder="$t('Search names and descriptions')"
          :aria-label="$t('Search')"
        />
      </div>
      <div class="flex rounded-full bg-white p-1 shadow-sm" role="radiogroup" :aria-label="$t('Kind')">
        <button
          v-for="k in kinds"
          :key="k.value"
          type="button"
          role="radio"
          :aria-checked="kind === k.value"
          class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition"
          :class="kind === k.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'"
          @click="kind = k.value"
        >
          <i class="mdi" :class="k.icon" /> {{ $t(k.label) }}
        </button>
      </div>
      <select v-model="folder" class="input !w-auto" :aria-label="$t('Folder')">
        <option value="*">{{ $t('All folders') }}</option>
        <option value="">{{ $t('Not in a folder') }}</option>
        <option v-for="f in folders" :key="f" :value="f">{{ f }}</option>
      </select>
    </div>

    <p v-if="error" class="mt-6 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>

    <div class="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5" :class="{ 'opacity-60': loading }">
      <div
        v-for="item in items"
        :key="item.id"
        class="group cursor-pointer overflow-hidden rounded-[1.75rem] bg-white shadow-sm ring-1 transition hover:-translate-y-1 hover:shadow-xl"
        :class="open?.id === item.id ? 'ring-2 ring-[#00a998]' : 'ring-slate-200/60'"
        :data-media="item.originalName"
        @click="details(item)"
      >
        <div class="relative aspect-square bg-slate-100">
          <img
            v-if="isImage(item)"
            :src="item.url"
            :alt="item.alt?.en || item.originalName"
            loading="lazy"
            class="h-full w-full object-cover"
          />
          <video v-else-if="isVideo(item)" :src="item.url" class="h-full w-full object-cover" muted preload="metadata" />
          <div v-else class="flex h-full items-center justify-center text-4xl text-slate-300"><i class="mdi mdi-format-font" /></div>
          <span
            class="absolute bottom-2 start-2 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm"
            :class="item.usedIn?.length ? 'bg-white/90 text-slate-600' : 'bg-amber-100/95 text-amber-800'"
          >
            {{ item.usedIn?.length ? $t('Used in {n}', { n: item.usedIn.length }) : $t('Not used') }}
          </span>
          <span v-if="item.folder" class="absolute end-2 top-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] text-white">
            <i class="mdi mdi-folder-outline" /> {{ item.folder }}
          </span>
        </div>
        <div class="flex items-center gap-1 p-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-medium" :title="item.originalName">
              <bdi>{{ item.originalName }}</bdi>
            </p>
            <p class="text-[11px] text-slate-400">
              <bdi dir="ltr">{{ size(item.size) }}</bdi>
            </p>
          </div>
          <button type="button" class="btn-icon" :title="$t(copied === item.id ? 'Copied' : 'Copy URL')" @click.stop="copy(item)">
            <i class="mdi" :class="copied === item.id ? 'mdi-check text-emerald-600' : 'mdi-link-variant'" />
          </button>
          <button type="button" class="btn-icon hover:!text-red-600" :title="$t('Delete')" @click.stop="remove(item)">
            <i class="mdi mdi-trash-can-outline" />
          </button>
        </div>
      </div>
    </div>
    <p v-if="!loading && !items.length" class="mt-16 text-center text-sm text-slate-400">
      {{ q || kind || folder !== '*' ? $t('Nothing matches.') : $t('No files yet.') }}
    </p>

    <!-- Details -->
    <div v-if="open" class="fixed inset-0 z-50 flex justify-end bg-slate-900/20" @click.self="open = null">
      <form
        class="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('File details')"
        @submit.prevent="saveDetails"
      >
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 class="font-black">{{ $t('File details') }}</h2>
          <button type="button" class="btn-icon" :title="$t('Close')" @click="open = null"><i class="mdi mdi-close text-lg" /></button>
        </div>
        <div class="bg-slate-100">
          <img v-if="isImage(open)" :src="open.url" :alt="draft.alt.en" class="mx-auto max-h-72 object-contain" />
          <video v-else-if="isVideo(open)" :src="open.url" class="mx-auto max-h-72" controls muted />
        </div>
        <div class="space-y-4 px-6 py-5">
          <p class="text-xs text-slate-500" dir="ltr">
            {{ open.mime }} · {{ size(open.size) }}<template v-if="open.width"> · {{ open.width }} × {{ open.height }} px</template>
          </p>
          <div>
            <label class="field-label" for="media-name">{{ $t('Name') }}</label>
            <input id="media-name" v-model="draft.originalName" class="input" />
          </div>
          <div>
            <label class="field-label" for="media-folder">{{ $t('Folder') }}</label>
            <input id="media-folder" v-model="draft.folder" class="input" list="media-folders" :placeholder="$t('e.g. Projects')" />
            <datalist id="media-folders"><option v-for="f in folders" :key="f" :value="f" /></datalist>
          </div>
          <template v-if="isImage(open)">
            <p class="text-xs leading-relaxed text-slate-500">
              {{
                $t('Describe the picture for people who cannot see it. Used wherever the page gives the picture no description of its own.')
              }}
            </p>
            <div v-for="l in locales" :key="l.code">
              <label class="field-label" :for="`alt-${l.code}`">{{ $t('Description ({lang})', { lang: l.label }) }}</label>
              <input :id="`alt-${l.code}`" v-model="draft.alt[l.code]" class="input" :dir="l.dir" maxlength="300" />
            </div>
          </template>
          <div class="flex items-center gap-3">
            <button type="submit" class="btn-dark" :disabled="saving">{{ $t(saving ? 'Saving…' : 'Save') }}</button>
            <span v-if="savedNote" class="text-xs text-emerald-700" role="status"><i class="mdi mdi-check" /> {{ $t('Saved') }}</span>
          </div>

          <div class="border-t border-slate-100 pt-4">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400">{{ $t('Used in') }}</h3>
            <ul v-if="open.usedIn?.length" class="mt-2 space-y-1.5">
              <li v-for="u in open.usedIn" :key="`${u.kind}-${u.id}`">
                <NuxtLink :to="usageLink(u)" class="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-slate-50">
                  <i
                    class="mdi text-slate-400"
                    :class="
                      { page: 'mdi-file-document-outline', item: 'mdi-view-dashboard-variant-outline', settings: 'mdi-palette-outline' }[
                        u.kind
                      ]
                    "
                  />
                  {{ u.kind === 'settings' ? $t('Site settings') : u.name }}
                </NuxtLink>
              </li>
            </ul>
            <p v-else class="mt-2 text-sm text-slate-400">{{ $t('Not used anywhere yet.') }}</p>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
