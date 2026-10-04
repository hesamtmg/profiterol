<script setup lang="ts">
/**
 * Text that visitors see as plain text and editors can click and type into on the canvas.
 * Vue renders no children for the editable element; its text is set by hand so typing keeps the caret.
 */
const props = defineProps<{
  value: unknown;
  /** Where the text lives in the block's props, e.g. `title` or `items.2.text`. Leave out to make it read-only. */
  path?: string;
  /** Allow line breaks (Enter); otherwise Enter finishes editing. */
  multiline?: boolean;
  placeholder?: string;
}>();

const ctx = useBlockEditing();
const el = ref<HTMLElement | null>(null);
const text = computed(() => String(props.value ?? ''));
const editable = computed(() => Boolean(ctx && props.path));

function sync() {
  if (el.value && document.activeElement !== el.value && el.value.innerText !== text.value) el.value.innerText = text.value;
}

onMounted(sync);
watch(text, sync);

function read() {
  const raw = (el.value?.innerText ?? '').replace(/ /g, ' ');
  return props.multiline ? raw.replace(/\n$/, '') : raw.replace(/\s*\n\s*/g, ' ');
}

function onInput() {
  ctx!.update(props.path!, read());
}

function onKeydown(e: KeyboardEvent) {
  if ((e.key === 'Enter' && !props.multiline) || e.key === 'Escape') {
    e.preventDefault();
    el.value?.blur();
  }
}

/** Paste as plain text, without the formatting of wherever it was copied from. */
function onPaste(e: ClipboardEvent) {
  e.preventDefault();
  let pasted = e.clipboardData?.getData('text/plain') ?? '';
  if (!props.multiline) pasted = pasted.replace(/\s*\n\s*/g, ' ');
  document.execCommand('insertText', false, pasted);
}
</script>

<template>
  <span
    v-if="editable"
    ref="el"
    class="editable"
    :class="{ 'whitespace-pre-wrap': multiline }"
    contenteditable="plaintext-only"
    role="textbox"
    :aria-multiline="multiline ? 'true' : 'false'"
    :data-placeholder="placeholder ?? 'Type here…'"
    @input="onInput"
    @blur="sync"
    @keydown="onKeydown"
    @paste="onPaste"
  />
  <template v-else>{{ text }}</template>
</template>
