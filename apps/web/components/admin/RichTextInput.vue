<script setup lang="ts">
/** A small formatted-text editor for `richtext` fields. The API removes anything unsafe on save. */
const model = defineModel<string>();
defineProps<{ dir?: string }>();
const el = ref<HTMLElement | null>(null);

function sync() {
  if (el.value && document.activeElement !== el.value && el.value.innerHTML !== (model.value ?? '')) el.value.innerHTML = model.value ?? '';
}
onMounted(sync);
watch(model, sync);

function emit() {
  model.value = el.value?.innerHTML ?? '';
}

function run(command: string, value?: string) {
  el.value?.focus();
  document.execCommand(command, false, value);
  emit();
}

function addLink() {
  const url = window.prompt(translate('Link address (https://…, /page or #anchor)'));
  if (url) run('createLink', url.trim());
}

function onPaste(e: ClipboardEvent) {
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '');
}

const tools: { icon: string; title: string; action: () => void }[] = [
  { icon: 'mdi-format-header-2', title: 'Heading', action: () => run('formatBlock', 'h2') },
  { icon: 'mdi-format-header-3', title: 'Small heading', action: () => run('formatBlock', 'h3') },
  { icon: 'mdi-format-paragraph', title: 'Paragraph', action: () => run('formatBlock', 'p') },
  { icon: 'mdi-format-bold', title: 'Bold (Ctrl+B)', action: () => run('bold') },
  { icon: 'mdi-format-italic', title: 'Italic (Ctrl+I)', action: () => run('italic') },
  { icon: 'mdi-format-underline', title: 'Underline (Ctrl+U)', action: () => run('underline') },
  { icon: 'mdi-format-list-bulleted', title: 'Bulleted list', action: () => run('insertUnorderedList') },
  { icon: 'mdi-format-list-numbered', title: 'Numbered list', action: () => run('insertOrderedList') },
  { icon: 'mdi-format-quote-close', title: 'Quote', action: () => run('formatBlock', 'blockquote') },
  { icon: 'mdi-link-variant', title: 'Link', action: addLink },
  { icon: 'mdi-link-variant-off', title: 'Remove link', action: () => run('unlink') },
  { icon: 'mdi-format-clear', title: 'Clear formatting', action: () => run('removeFormat') },
];
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-900/5">
    <div class="flex flex-wrap gap-0.5 border-b border-slate-100 bg-slate-50 p-1" role="toolbar" :aria-label="$t('Formatting')">
      <button
        v-for="t in tools"
        :key="t.icon"
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"
        :title="$t(t.title)"
        :aria-label="$t(t.title)"
        @mousedown.prevent
        @click="t.action"
      >
        <i class="mdi text-base" :class="t.icon" />
      </button>
    </div>
    <div
      ref="el"
      class="prose-site max-h-80 min-h-[8rem] overflow-y-auto px-3 py-2 text-sm text-slate-800 outline-none"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      :dir="dir"
      @input="emit"
      @paste="onPaste"
    />
  </div>
</template>
