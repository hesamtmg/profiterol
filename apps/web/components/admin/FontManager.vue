<script setup lang="ts">
/**
 * Upload your own fonts (WOFF2, WOFF, TTF, OTF), one file per weight. They then appear in every theme
 * editor's font lists. Each font shows a sample in Latin and Persian letters.
 */
import { fontFaceCss, isFontName, type SiteFont } from '@profiterol/blocks';

const fonts = defineModel<SiteFont[]>({ required: true });
const { upload, uploading, error } = useUpload();
const name = ref('');
const weight = ref(400);
const style = ref<'normal' | 'italic'>('normal');
const problem = ref('');
const input = ref<HTMLInputElement | null>(null);

const WEIGHTS = [
  [100, 'Thin'],
  [200, 'Extra light'],
  [300, 'Light'],
  [400, 'Regular'],
  [500, 'Medium'],
  [600, 'Semi bold'],
  [700, 'Bold'],
  [800, 'Extra bold'],
  [900, 'Black'],
] as const;

// Load the uploaded fonts in the admin too, for the samples.
useHead({ style: [{ innerHTML: () => fontFaceCss(fonts.value) }] });

/** Suggest a name from the file, e.g. "Logotype-Bold.woff2" → "Logotype". */
function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file && !name.value) name.value = file.name.replace(/\.[^.]+$/, '').split(/[-_ ]/)[0].replace(/[^\p{L}\p{N} ]/gu, '').slice(0, 40);
}

async function add() {
  problem.value = '';
  const file = input.value?.files?.[0];
  const n = name.value.trim();
  if (!file) return (problem.value = 'Choose a font file first.');
  if (!isFontName(n)) return (problem.value = 'Use letters, digits, spaces or dashes for the name (up to 40).');
  const media = await upload(file);
  if (!media) return;
  const next = fonts.value.map((f) => ({ ...f, files: [...f.files] }));
  const existing = next.find((f) => f.name.toLowerCase() === n.toLowerCase());
  const entry = { url: media.url, weight: weight.value, style: style.value };
  if (existing) existing.files = [...existing.files.filter((x) => x.weight !== entry.weight || x.style !== entry.style), entry];
  else next.push({ name: n, files: [entry] });
  fonts.value = next;
  if (input.value) input.value.value = '';
}

function removeFile(font: SiteFont, url: string) {
  fonts.value = fonts.value
    .map((f) => (f === font ? { ...f, files: f.files.filter((x) => x.url !== url) } : f))
    .filter((f) => f.files.length);
}

const weightLabel = (w: number) => WEIGHTS.find(([v]) => v === w)?.[1] ?? String(w);
</script>

<template>
  <div>
    <div v-if="fonts.length" class="space-y-3">
      <div v-for="font in fonts" :key="font.name" class="rounded-2xl bg-slate-50 p-4">
        <div class="flex items-baseline justify-between gap-3">
          <p class="truncate text-2xl" :style="{ fontFamily: `'${font.name}', system-ui` }">{{ font.name }} · Aa Bb · سلام ۱۲۳</p>
          <button type="button" class="btn-icon shrink-0 hover:!text-red-600" :aria-label="`Remove ${font.name}`" @click="fonts = fonts.filter((f) => f !== font)">
            <i class="mdi mdi-delete-outline" />
          </button>
        </div>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="file in font.files"
            :key="file.url"
            class="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] ring-1 ring-slate-200"
            :style="{ fontFamily: `'${font.name}', system-ui`, fontWeight: file.weight, fontStyle: file.style }"
          >
            {{ weightLabel(file.weight) }}{{ file.style === 'italic' ? ' italic' : '' }}
            <button type="button" class="text-slate-400 hover:text-red-600" aria-label="Remove this file" @click="removeFile(font, file.url)"><i class="mdi mdi-close" /></button>
          </span>
        </div>
      </div>
    </div>
    <p v-else class="text-xs text-slate-400">No fonts yet. Upload one file per weight; the same name groups them into one font.</p>

    <div class="mt-4 grid gap-2 sm:grid-cols-[1fr_9rem_7rem]">
      <input ref="input" type="file" accept=".woff2,.woff,.ttf,.otf" class="input sm:col-span-3" aria-label="Font file" @change="onPick" />
      <input v-model="name" class="input" placeholder="Font name, e.g. Logotype" aria-label="Font name" />
      <select v-model.number="weight" class="input" aria-label="Weight">
        <option v-for="[v, label] in WEIGHTS" :key="v" :value="v">{{ v }} {{ label }}</option>
      </select>
      <select v-model="style" class="input" aria-label="Style">
        <option value="normal">Normal</option>
        <option value="italic">Italic</option>
      </select>
    </div>
    <div class="mt-3 flex items-center gap-3">
      <button type="button" class="btn-dark" :disabled="uploading" @click="add">
        <i class="mdi" :class="uploading ? 'mdi-loading mdi-spin' : 'mdi-upload'" /> Upload font
      </button>
      <span v-if="problem || error" class="text-xs text-red-600">{{ problem || error }}</span>
    </div>
  </div>
</template>
