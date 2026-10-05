<script setup lang="ts">
/** Renders the input for one registry field. List fields render their items with this same component. */
import { createListItem, type FieldDef } from '@profiterol/blocks';
import FieldInput from './FieldInput.vue';
import MediaPicker from './MediaPicker.vue';
import RichTextInput from './RichTextInput.vue';

const props = defineProps<{ field: FieldDef; dir?: string }>();
const model = defineModel<unknown>();
const picking = ref(false);
const dragOver = ref(false);
const { upload, uploading, error: uploadError } = useUpload();

async function uploadImage(file: File | null) {
  dragOver.value = false;
  if (!file) return;
  const media = await upload(file);
  if (media) model.value = media.url;
}

function onImageDrop(e: DragEvent) {
  uploadImage(mediaFrom(e.dataTransfer, props.field.type === 'video' ? 'video' : 'image'));
}

/** Pasting a copied image (e.g. a screenshot) uploads it; pasting text works as usual. */
function onImagePaste(e: ClipboardEvent) {
  const file = imageFrom(e.clipboardData);
  if (!file) return;
  e.preventDefault();
  uploadImage(file);
}
const { list: collections, load: loadCollections } = useAdminCollections();
if (props.field.type === 'collection') loadCollections().catch(() => undefined);
const openItem = ref<number | null>(0);

const list = computed(() => (Array.isArray(model.value) ? (model.value as Record<string, unknown>[]) : []));

function addItem() {
  // Read the index first: the model only reflects the new list after the parent re-renders.
  const index = list.value.length;
  model.value = [...list.value, createListItem(props.field)];
  openItem.value = index;
}

function removeItem(i: number) {
  model.value = list.value.filter((_, j) => j !== i);
}

function moveItem(i: number, delta: number) {
  const next = [...list.value];
  const [item] = next.splice(i, 1);
  next.splice(i + delta, 0, item);
  model.value = next;
  openItem.value = i + delta;
}

function duplicateItem(i: number) {
  const next = [...list.value];
  next.splice(i + 1, 0, JSON.parse(JSON.stringify(list.value[i])));
  model.value = next;
  openItem.value = i + 1;
}

function itemTitle(item: Record<string, unknown>, i: number) {
  const key = props.field.itemLabel;
  const label = key ? String(item[key] ?? '') : '';
  return label || translate('Item {n}', { n: i + 1 });
}

function setItemField(i: number, key: string, value: unknown) {
  const next = [...list.value];
  next[i] = { ...next[i], [key]: value };
  model.value = next;
}

const atMax = computed(() => props.field.max !== undefined && list.value.length >= props.field.max);
</script>

<template>
  <div>
    <label class="field-label">{{ $t(field.label) }}</label>

    <input v-if="field.type === 'text'" v-model="model" type="text" class="input" :dir="dir" />
    <input
      v-else-if="field.type === 'url'"
      v-model="model"
      type="text"
      class="input font-mono text-xs"
      dir="ltr"
      placeholder="/page, #anchor or https://…"
    />
    <textarea v-else-if="field.type === 'textarea'" v-model="model" rows="4" class="input resize-y leading-relaxed" :dir="dir" />
    <RichTextInput v-else-if="field.type === 'richtext'" :model-value="model as string" :dir="dir" @update:model-value="model = $event" />
    <input v-else-if="field.type === 'number'" v-model.number="model" type="number" class="input" />
    <label v-else-if="field.type === 'boolean'" class="flex items-center gap-2 text-sm">
      <input v-model="model" type="checkbox" class="h-4 w-4 rounded" /> {{ $t(field.label) }}
    </label>
    <select v-else-if="field.type === 'select'" v-model="model" class="input">
      <option v-for="o in field.options" :key="o.value" :value="o.value">{{ $t(o.label) }}</option>
    </select>
    <select v-else-if="field.type === 'collection'" v-model="model" class="input">
      <option v-if="!collections?.length" disabled value="">{{ $t('No collections yet') }}</option>
      <option v-for="c in collections ?? []" :key="c.key" :value="c.key">{{ c.name.en || c.key }}</option>
    </select>
    <div v-else-if="field.type === 'color'" class="flex items-center gap-2">
      <input
        type="color"
        :value="(model as string) || '#000000'"
        class="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
        @input="model = ($event.target as HTMLInputElement).value"
      />
      <input v-model="model" type="text" class="input font-mono text-xs" dir="ltr" placeholder="#00a998" />
    </div>

    <div
      v-else-if="field.type === 'image' || field.type === 'video'"
      class="rounded-2xl p-1 transition"
      :class="dragOver ? 'bg-sky-50 ring-2 ring-sky-400' : ''"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="onImageDrop"
    >
      <div class="flex items-center gap-2">
        <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          <video
            v-if="model && field.type === 'video'"
            :src="model as string"
            muted
            preload="metadata"
            class="h-full w-full object-cover"
          />
          <img v-else-if="model" :src="model as string" alt="" class="h-full w-full object-cover" />
          <span v-else class="flex h-full items-center justify-center text-slate-300">
            <i class="mdi text-xl" :class="field.type === 'video' ? 'mdi-movie-outline' : 'mdi-image-outline'" />
          </span>
          <span v-if="uploading" class="absolute inset-0 flex items-center justify-center bg-white/80 text-slate-500">
            <i class="mdi mdi-loading mdi-spin text-xl" />
          </span>
        </div>
        <input
          v-model="model"
          type="text"
          class="input min-w-0 text-xs"
          :class="{ 'font-mono': model }"
          :dir="model ? 'ltr' : undefined"
          :placeholder="field.type === 'video' ? $t('Drop a video') : $t('Drop an image')"
          @paste="onImagePaste"
        />
        <button type="button" class="btn-light shrink-0 !px-3" :title="$t('Choose from media')" @click="picking = true">
          <i class="mdi mdi-folder-image" />
        </button>
      </div>
      <p v-if="uploadError" class="mt-1 text-[11px] text-red-600">{{ uploadError }}</p>
      <MediaPicker v-if="picking" @close="picking = false" @pick="(url) => ((model = url), (picking = false))" />
    </div>

    <div v-else-if="field.type === 'list'" class="space-y-2">
      <div v-for="(item, i) in list" :key="i" class="rounded-2xl border border-slate-200 bg-slate-50/60">
        <div class="flex items-center gap-1 px-3 py-2">
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2 text-start text-sm font-medium"
            @click="openItem = openItem === i ? null : i"
          >
            <i class="mdi text-slate-400" :class="openItem === i ? 'mdi-chevron-down' : 'mdi-chevron-right'" />
            <span class="truncate" :dir="dir">{{ itemTitle(item, i) }}</span>
          </button>
          <button type="button" class="btn-icon !h-7 !w-7" :title="$t('Move up')" :disabled="i === 0" @click="moveItem(i, -1)">
            <i class="mdi mdi-arrow-up" />
          </button>
          <button
            type="button"
            class="btn-icon !h-7 !w-7"
            :title="$t('Move down')"
            :disabled="i === list.length - 1"
            @click="moveItem(i, 1)"
          >
            <i class="mdi mdi-arrow-down" />
          </button>
          <button type="button" class="btn-icon !h-7 !w-7" :title="$t('Duplicate')" :disabled="atMax" @click="duplicateItem(i)">
            <i class="mdi mdi-content-copy" />
          </button>
          <button type="button" class="btn-icon !h-7 !w-7 hover:!text-red-600" :title="$t('Remove')" @click="removeItem(i)">
            <i class="mdi mdi-close" />
          </button>
        </div>
        <div v-if="openItem === i" class="space-y-3 border-t border-slate-200 px-3 py-3">
          <FieldInput
            v-for="sub in field.fields"
            :key="sub.key"
            :field="sub"
            :dir="dir"
            :model-value="item[sub.key]"
            @update:model-value="(v) => setItemField(i, sub.key, v)"
          />
        </div>
      </div>
      <button type="button" class="btn-light w-full" :disabled="atMax" @click="addItem">
        <i class="mdi mdi-plus" /> Add {{ field.label.toLowerCase().replace(/s$/, '') }}
      </button>
    </div>

    <p v-if="field.help" class="mt-1 text-[11px] text-slate-400">{{ $t(field.help) }}</p>
  </div>
</template>
