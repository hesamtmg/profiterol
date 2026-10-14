<script setup lang="ts">
/**
 * Pictures and files attached to a request to the AI block builder: a design to match, a screenshot, a logo, a PDF
 * or text with the content. Picked with the button, pasted, or dropped on the form (see `add`). They go with that
 * one request; the conversation keeps only their names and small previews.
 */
const files = defineModel<File[]>({ required: true });
const props = defineProps<{ disabled?: boolean }>();

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const TEXT = /\.(txt|md|markdown|csv|tsv|json|html?|css|js|ts|vue|xml|svg|ya?ml)$/i;
const ACCEPT = 'image/*,.pdf,.txt,.md,.csv,.tsv,.json,.html,.htm,.css,.js,.ts,.vue,.xml,.svg,.yml,.yaml';

const input = ref<HTMLInputElement>();
const problem = ref('');
const previews = new Map<File, string>();

const preview = (f: File) => {
  if (!f.type.startsWith('image/') || f.type === 'image/svg+xml') return '';
  if (!previews.has(f)) previews.set(f, URL.createObjectURL(f));
  return previews.get(f)!;
};
const allowed = (f: File) => f.type.startsWith('image/') || f.type === 'application/pdf' || /\.pdf$/i.test(f.name) || TEXT.test(f.name);

/** Adds files (from the button, a paste or a drop), refusing what the API would refuse. */
function add(list: FileList | File[] | null | undefined) {
  problem.value = '';
  for (const f of Array.from(list ?? [])) {
    if (files.value.length >= MAX_FILES) {
      problem.value = translate('Attach up to {n} files', { n: MAX_FILES });
      break;
    }
    if (!allowed(f)) problem.value = translate('“{name}” cannot be attached. Attach pictures, PDFs or text files.', { name: f.name });
    else if (f.size > MAX_BYTES) problem.value = translate('“{name}” is larger than 10 MB.', { name: f.name });
    else files.value = [...files.value, f];
  }
}

function remove(f: File) {
  const url = previews.get(f);
  if (url) URL.revokeObjectURL(url);
  previews.delete(f);
  files.value = files.value.filter((x) => x !== f);
}

// Sent: let go of the previews.
watch(files, (now) => {
  for (const [f, url] of previews) {
    if (!now.includes(f)) {
      URL.revokeObjectURL(url);
      previews.delete(f);
    }
  }
});
onBeforeUnmount(() => previews.forEach((url) => URL.revokeObjectURL(url)));

defineExpose({ add });
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <input
      ref="input"
      type="file"
      multiple
      class="hidden"
      :accept="ACCEPT"
      :aria-label="$t('Attach pictures or files')"
      data-testid="ai-attach-input"
      @change="
        add(($event.target as HTMLInputElement).files);
        ($event.target as HTMLInputElement).value = '';
      "
    />
    <button
      type="button"
      class="btn-pill text-xs"
      :disabled="props.disabled || files.length >= MAX_FILES"
      :title="$t('Attach a design, screenshot, logo, PDF or text file. You can also paste or drop them here.')"
      @click="input?.click()"
    >
      <i class="mdi mdi-paperclip" /> {{ $t('Attach') }}
    </button>
    <span
      v-for="f in files"
      :key="`${f.name}-${f.size}-${f.lastModified}`"
      class="flex max-w-56 items-center gap-1.5 rounded-full bg-slate-100 py-1 pe-1 ps-1.5 text-xs"
      data-testid="ai-attachment"
    >
      <img v-if="preview(f)" :src="preview(f)" alt="" class="h-6 w-6 rounded-full object-cover" />
      <i v-else class="mdi text-base text-slate-500" :class="/\.pdf$/i.test(f.name) ? 'mdi-file-pdf-box' : 'mdi-file-document-outline'" />
      <span class="truncate">{{ f.name }}</span>
      <button type="button" class="btn-icon !h-5 !w-5 !p-0" :aria-label="$t('Remove {name}', { name: f.name })" @click="remove(f)">
        <i class="mdi mdi-close text-sm" />
      </button>
    </span>
    <p v-if="problem" class="w-full text-xs text-red-600" role="alert">{{ problem }}</p>
  </div>
</template>
