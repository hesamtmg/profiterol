<script setup lang="ts">
/**
 * Shows a custom block's draft inside the sandboxed preview frame (server/routes/admin/block-sandbox.get.ts), so code
 * nobody has approved yet never runs in the admin itself. The frame gets the compiled code, the field values and the
 * site's styles through postMessage, and reports back its height and any error.
 */
import { getLocale, themeToCss, type ThemeTokens } from '@profiterol/blocks';

const props = defineProps<{
  code: string;
  values: Record<string, unknown>;
  locale: string;
  theme: ThemeTokens;
  /** Frame width, for the phone / desktop switch. */
  width?: string;
}>();
const emit = defineEmits<{ error: [message: string]; rendered: [] }>();

const frame = ref<HTMLIFrameElement>();
const height = ref(320);
const ready = ref(false);
/** Vue's browser build, sent to the frame with the first message (the frame loads nothing itself). */
let vue: Promise<string> | null = null;
let vueSent = false;

/** The site's own stylesheets (icons, fonts), plus the theme's colors as CSS variables. */
function siteStyles() {
  const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((l) => l.href);
  // In development Nuxt adds its CSS inline instead; the icon and font faces are what blocks need from it.
  const inline = [...document.querySelectorAll('style')]
    .map((s) => s.textContent ?? '')
    .filter((t) => t.includes('@font-face') || t.includes('.mdi'));
  inline.push(`:root{${themeToCss(props.theme)}}`);
  return { links, inline };
}

async function post() {
  if (!ready.value || !frame.value?.contentWindow) return;
  vue ??= $fetch<string>('/api/public/custom-blocks/vue.js', { responseType: 'text' });
  const runtime = vueSent ? undefined : await vue;
  vueSent = true;
  frame.value?.contentWindow?.postMessage(
    {
      target: 'profiterol-block-sandbox',
      vue: runtime,
      code: props.code,
      props: JSON.parse(JSON.stringify(props.values)),
      locale: props.locale,
      dir: getLocale(props.locale)?.dir ?? 'ltr',
      styles: siteStyles(),
    },
    '*',
  );
}

function onMessage(e: MessageEvent) {
  if (e.source !== frame.value?.contentWindow || e.data?.source !== 'profiterol-block-sandbox') return;
  if (e.data.type === 'ready') {
    ready.value = true;
    vueSent = false;
    post();
  } else if (e.data.type === 'height') height.value = Math.max(80, Math.min(4000, Number(e.data.value) || 0));
  else if (e.data.type === 'error') emit('error', String(e.data.message));
  else if (e.data.type === 'rendered') emit('rendered');
}

watch(() => [props.code, props.values, props.locale, props.theme], post, { deep: true });
onMounted(() => window.addEventListener('message', onMessage));
onBeforeUnmount(() => window.removeEventListener('message', onMessage));
</script>

<template>
  <div class="flex justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
    <iframe
      ref="frame"
      src="/admin/block-sandbox"
      sandbox="allow-scripts"
      title="Block preview"
      class="block border-0 transition-[width]"
      :style="{ width: width ?? '100%', height: `${height}px` }"
    />
  </div>
</template>
