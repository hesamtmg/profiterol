<script setup lang="ts">
/**
 * minicms kind 9: text formatted by the editor (headings, bold, lists, links, quotes).
 * The API keeps only safe tags when the page is saved, so visitors get clean HTML.
 * On the canvas the text can be edited in place; Ctrl+B / Ctrl+I work there too.
 */
const props = defineProps<{ p: { html: string }; locale: string }>();
const ctx = useBlockEditing();
const el = ref<HTMLElement | null>(null);

function sync() {
  if (el.value && document.activeElement !== el.value && el.value.innerHTML !== props.p.html) el.value.innerHTML = props.p.html ?? '';
}
onMounted(sync);
watch(() => props.p.html, sync);

function onInput() {
  ctx?.update('html', el.value?.innerHTML ?? '');
}

/** Paste as plain text, so styles from other pages and apps do not come along. */
function onPaste(e: ClipboardEvent) {
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '');
}
</script>

<template>
  <section class="w-full bg-surface px-6 py-12 text-ink @3xl:px-16 @3xl:py-20">
    <div
      v-if="ctx"
      ref="el"
      class="prose-site editable mx-auto max-w-3xl"
      style="display: block"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      data-placeholder="Write here…"
      @input="onInput"
      @blur="sync"
      @paste="onPaste"
    />
    <!-- eslint-disable-next-line vue/no-v-html -- cleaned by the API on save (common/rich-text.ts) -->
    <div v-else class="prose-site mx-auto max-w-3xl" v-html="p.html" />
  </section>
</template>
