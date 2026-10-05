<script setup lang="ts">
/** Edits a full theme: ready-made presets, colors, corners, button shape, fonts, header style and motion. */
import { themeFonts, themeMotion, themeMotionKeys, themePresets, themeRadii, type SavedTheme, type ThemeTokens } from '@profiterol/blocks';

const theme = defineModel<ThemeTokens>({ required: true });
defineProps<{
  compact?: boolean;
  /** Names of the fonts uploaded in Site settings. */
  customFonts?: string[];
  /** Themes saved under the owner's own names; leave out to hide the "Your themes" row. */
  savedThemes?: SavedTheme[];
}>();
const emit = defineEmits<{ 'save-theme': [name: string]; 'delete-theme': [key: string] }>();

function saveCurrent() {
  const name = window.prompt(translate('Name for this theme'))?.trim();
  if (name) emit('save-theme', name.slice(0, 40));
}

const colors: { key: keyof ThemeTokens; label: string }[] = [
  { key: 'background', label: 'Page background' },
  { key: 'surface', label: 'Panels' },
  { key: 'primary', label: 'Main color' },
  { key: 'secondary', label: 'Second color' },
  { key: 'dark', label: 'Dark sections' },
  { key: 'text', label: 'Text' },
  { key: 'muted', label: 'Soft text' },
];

function set<K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) {
  theme.value = { ...theme.value, [key]: value };
}

const isMotionKey = (k: string) => (themeMotionKeys as readonly string[]).includes(k);

/** Presets are about looks; the motion settings are compared and kept separately. */
function isPreset(preset: ThemeTokens) {
  return (Object.keys(preset) as (keyof ThemeTokens)[]).every((k) => isMotionKey(k) || preset[k] === theme.value[k]);
}

function applyPreset(preset: Partial<ThemeTokens>) {
  const motion = Object.fromEntries(themeMotionKeys.map((k) => [k, theme.value[k]]));
  theme.value = { ...theme.value, ...preset, ...motion } as ThemeTokens;
}

function isSaved(saved: Partial<ThemeTokens>) {
  return (Object.keys(saved) as (keyof ThemeTokens)[]).every((k) => isMotionKey(k) || saved[k] === theme.value[k]);
}

/** Shrinks a panel radius for the small preview tiles. */
function tileRadius(radius: string) {
  return `calc(${radius} / 4)`;
}
</script>

<template>
  <div class="space-y-6">
    <!-- The owner's own themes -->
    <section v-if="savedThemes">
      <div class="mb-2 flex items-center justify-between">
        <h3 class="field-label !mb-0">{{ $t('Your themes') }}</h3>
        <button type="button" class="text-[11px] font-semibold text-sky-600 hover:underline" @click="saveCurrent">
          <i class="mdi mdi-content-save-outline" /> {{ $t('Save current') }}
        </button>
      </div>
      <p v-if="!savedThemes.length" class="text-[11px] text-slate-400">{{ $t('Save the colors, fonts and shapes you chose to reuse them on other pages.') }}</p>
      <div v-else class="grid gap-2" :class="compact ? 'grid-cols-2' : 'grid-cols-3'">
        <div v-for="saved in savedThemes" :key="saved.key" class="group relative">
          <button
            type="button"
            class="w-full rounded-2xl p-1.5 text-start ring-2 transition"
            :class="isSaved(saved.theme) ? 'ring-sky-500' : 'ring-transparent hover:ring-slate-300'"
            :title="$t('Use your {name} theme', { name: saved.name })"
            @click="applyPreset(saved.theme)"
          >
            <span class="block h-12 p-2" :style="{ background: saved.theme.background, borderRadius: '0.9rem' }">
              <span class="flex h-full items-end gap-1 p-1.5" :style="{ background: saved.theme.surface, borderRadius: '0.5rem' }">
                <span class="h-2.5 w-2.5 rounded-full" :style="{ background: saved.theme.primary }" />
                <span class="h-2.5 w-2.5 rounded-full" :style="{ background: saved.theme.secondary }" />
              </span>
            </span>
            <span class="mt-1 block truncate px-1 text-[11px] font-medium text-slate-600">{{ saved.name }}</span>
          </button>
          <button
            type="button"
            class="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-white text-xs text-slate-500 shadow ring-1 ring-slate-200 hover:text-red-600 group-hover:flex"
            :aria-label="$t('Delete the {name} theme', { name: saved.name })"
            @click="emit('delete-theme', saved.key)"
          >
            <i class="mdi mdi-close" />
          </button>
        </div>
      </div>
    </section>

    <!-- Presets -->
    <section>
      <h3 class="field-label !mb-2">{{ $t('Ready-made themes') }}</h3>
      <div class="grid gap-2" :class="compact ? 'grid-cols-2' : 'grid-cols-3'">
        <button
          v-for="preset in themePresets"
          :key="preset.key"
          type="button"
          class="group rounded-2xl p-1.5 text-start ring-2 transition"
          :class="isPreset(preset.theme) ? 'ring-sky-500' : 'ring-transparent hover:ring-slate-300'"
          :title="$t('Use the {name} theme', { name: preset.name })"
          @click="applyPreset(preset.theme)"
        >
          <span class="block h-16 p-2" :style="{ background: preset.theme.background, borderRadius: '0.9rem' }">
            <span
              class="flex h-full items-end gap-1 p-2"
              :style="{ background: preset.theme.surface, borderRadius: tileRadius(preset.theme.radius) }"
            >
              <span class="h-3 w-3 rounded-full" :style="{ background: preset.theme.primary }" />
              <span class="h-3 w-3 rounded-full" :style="{ background: preset.theme.secondary }" />
              <span class="ms-auto h-3 w-6" :style="{ background: preset.theme.dark, borderRadius: preset.theme.buttonRadius }" />
            </span>
          </span>
          <span class="mt-1 block px-1 text-[11px] font-medium text-slate-600">{{ $t(preset.name) }}</span>
        </button>
      </div>
    </section>

    <!-- Colors -->
    <section>
      <h3 class="field-label !mb-2">{{ $t('Colors') }}</h3>
      <div class="space-y-1.5">
        <label v-for="c in colors" :key="c.key" class="flex items-center gap-2.5 rounded-xl px-1 py-0.5 hover:bg-slate-50">
          <input
            type="color"
            :value="theme[c.key]"
            class="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            :aria-label="$t(c.label)"
            @input="set(c.key, ($event.target as HTMLInputElement).value as never)"
          />
          <span class="flex-1 text-xs">{{ $t(c.label) }}</span>
          <code class="text-[10px] text-slate-400" dir="ltr">{{ theme[c.key] }}</code>
        </label>
      </div>
    </section>

    <!-- Shapes -->
    <section class="space-y-3">
      <div>
        <label class="field-label" for="theme-radius">{{ $t('Panel corners') }}</label>
        <select id="theme-radius" class="input" :value="theme.radius" @change="set('radius', ($event.target as HTMLSelectElement).value)">
          <option v-for="r in themeRadii.panel" :key="r.value" :value="r.value">{{ $t(r.label) }}</option>
        </select>
      </div>
      <div>
        <span class="field-label">{{ $t('Buttons') }}</span>
        <div class="flex gap-1.5">
          <button
            v-for="r in themeRadii.button"
            :key="r.value"
            type="button"
            class="flex-1 border px-2 py-1.5 text-[11px] font-medium transition"
            :class="theme.buttonRadius === r.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:border-slate-400'"
            :style="{ borderRadius: r.value }"
            @click="set('buttonRadius', r.value)"
          >
            {{ $t(r.label) }}
          </button>
        </div>
      </div>
      <div>
        <span class="field-label">{{ $t('Header') }}</span>
        <div class="flex gap-1.5">
          <button
            v-for="h in ([{ value: 'solid', label: 'Solid' }, { value: 'glass', label: 'Frosted glass' }] as const)"
            :key="h.value"
            type="button"
            class="flex-1 rounded-full border px-2 py-1.5 text-[11px] font-medium transition"
            :class="theme.headerStyle === h.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:border-slate-400'"
            @click="set('headerStyle', h.value)"
          >
            {{ $t(h.label) }}
          </button>
        </div>
      </div>
    </section>

    <!-- Motion -->
    <section class="space-y-3">
      <h3 class="field-label !mb-2">{{ $t('Motion') }}</h3>
      <div>
        <label class="field-label" for="theme-cursor">{{ $t('Mouse pointer') }}</label>
        <select id="theme-cursor" class="input" :value="theme.cursor" @change="set('cursor', ($event.target as HTMLSelectElement).value as ThemeTokens['cursor'])">
          <option v-for="c in themeMotion.cursor" :key="c.value" :value="c.value">{{ $t(c.label) }}</option>
        </select>
      </div>
      <div>
        <label class="field-label" for="theme-transition">{{ $t('Page transition') }}</label>
        <select
          id="theme-transition"
          class="input"
          :value="theme.pageTransition"
          @change="set('pageTransition', ($event.target as HTMLSelectElement).value as ThemeTokens['pageTransition'])"
        >
          <option v-for="t in themeMotion.pageTransition" :key="t.value" :value="t.value">{{ $t(t.label) }}</option>
        </select>
      </div>
      <div>
        <label class="field-label" for="theme-scroll">{{ $t('Page scrolling') }}</label>
        <select
          id="theme-scroll"
          class="input"
          :value="theme.scrollMode"
          @change="set('scrollMode', ($event.target as HTMLSelectElement).value as ThemeTokens['scrollMode'])"
        >
          <option v-for="m in themeMotion.scrollMode" :key="m.value" :value="m.value">{{ $t(m.label) }}</option>
        </select>
      </div>
      <p class="text-[11px] leading-snug text-slate-400">{{ $t('Pointer and transition are skipped for visitors who turn off animations, and the pointer only changes for a mouse or trackpad.') }}</p>
    </section>

    <!-- Fonts -->
    <section class="space-y-3">
      <div>
        <label class="field-label" for="theme-font-fa">{{ $t('Persian font') }}</label>
        <select id="theme-font-fa" class="input" :value="theme.fontFa" @change="set('fontFa', ($event.target as HTMLSelectElement).value)">
          <optgroup v-if="customFonts?.length" :label="$t('Uploaded')">
            <option v-for="f in customFonts" :key="f" :value="f">{{ f }}</option>
          </optgroup>
          <optgroup :label="$t('Google Fonts')">
            <option v-for="f in themeFonts.fa" :key="f.name" :value="f.name">{{ f.name }}</option>
          </optgroup>
        </select>
      </div>
      <div>
        <label class="field-label" for="theme-font-en">{{ $t('Latin font') }}</label>
        <select id="theme-font-en" class="input" :value="theme.fontEn" @change="set('fontEn', ($event.target as HTMLSelectElement).value)">
          <optgroup v-if="customFonts?.length" :label="$t('Uploaded')">
            <option v-for="f in customFonts" :key="f" :value="f">{{ f }}</option>
          </optgroup>
          <optgroup :label="$t('Google Fonts')">
            <option v-for="f in themeFonts.en" :key="f.name" :value="f.name">{{ f.name }}</option>
          </optgroup>
        </select>
      </div>
    </section>
  </div>
</template>
