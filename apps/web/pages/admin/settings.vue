<script setup lang="ts">
import { cleanLoader, fontNames, locales, resolveTheme, type FieldDef, type LoaderSettings, type ThemeTokens } from '@profiterol/blocks';
import FieldInput from '~/components/admin/FieldInput.vue';
import FontManager from '~/components/admin/FontManager.vue';
import SiteLoader from '~/components/site/SiteLoader.vue';
import ThemeEditor from '~/components/admin/ThemeEditor.vue';
import type { SiteSettings } from '~/composables/useSite';

definePageMeta({ layout: 'admin', middleware: 'admin' });

const api = useApi();
const settings = ref<(SiteSettings & { notifyEmail: string; loader: LoaderSettings }) | null>(null);
const customFonts = computed(() => fontNames(settings.value?.fonts));
const loaderPreview = ref(0);
const saving = ref(false);
const message = ref<{ kind: 'ok' | 'error'; text: string } | null>(null);

const imageField = (key: string, label: string): FieldDef => ({ key, label, type: 'image' });

async function load() {
  const s = await api<SiteSettings & { notifyEmail: string }>('/admin/settings');
  s.fonts ??= [];
  s.savedThemes ??= [];
  s.theme = resolveTheme(s.theme, null, fontNames(s.fonts));
  const loader = cleanLoader(s.loader);
  for (const l of locales) {
    s.siteName[l.code] ??= '';
    s.maintenanceText[l.code] ??= '';
    loader.text[l.code] ??= '';
  }
  settings.value = { ...s, loader };
}

/** Saved themes are kept with the other settings and stored with "Save settings". */
function saveTheme(name: string) {
  const list = settings.value!.savedThemes;
  const key = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme'}-${Date.now().toString(36)}`.slice(0, 40);
  list.push({ key, name, theme: { ...settings.value!.theme } });
}

function deleteTheme(key: string) {
  settings.value!.savedThemes = settings.value!.savedThemes.filter((t) => t.key !== key);
}

function addMenuItem() {
  settings.value!.menu.push({ label: Object.fromEntries(locales.map((l) => [l.code, ''])), href: '' });
}

async function save() {
  if (!settings.value) return;
  saving.value = true;
  message.value = null;
  try {
    const { siteName, logo, favicon, theme, menu, maintenance, maintenanceText, notifyEmail, fonts, savedThemes, loader } = settings.value;
    await api('/admin/settings', {
      method: 'PUT',
      body: { siteName, logo, favicon, theme, menu, maintenance, maintenanceText, notifyEmail, fonts, savedThemes, loader },
    });
    message.value = { kind: 'ok', text: 'Settings saved' };
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div v-if="settings" class="grid gap-8 lg:grid-cols-[1fr_340px]">
    <div class="space-y-6">
      <div class="flex items-end justify-between">
        <div>
          <h1 class="text-3xl font-black">Site settings</h1>
          <p class="mt-1 text-sm font-light text-slate-500">Name, menu and theme for the whole site.</p>
        </div>
        <button type="button" class="btn-dark" :disabled="saving" @click="save">{{ saving ? 'Saving…' : 'Save settings' }}</button>
      </div>
      <p
        v-if="message"
        class="whitespace-pre-line rounded-2xl px-4 py-3 text-sm"
        :class="message.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'"
      >
        {{ message.text }}
      </p>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">Identity</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div v-for="l in locales" :key="l.code">
            <label class="field-label">Site name ({{ l.label }})</label>
            <input v-model="settings.siteName[l.code]" class="input" :dir="l.dir" />
          </div>
          <FieldInput v-model="settings.logo" :field="imageField('logo', 'Logo')" />
          <FieldInput v-model="settings.favicon" :field="imageField('favicon', 'Favicon')" />
        </div>
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <div class="flex items-center justify-between">
          <h2 class="font-black">Menu</h2>
          <button type="button" class="btn-light" @click="addMenuItem"><i class="mdi mdi-plus" /> Add link</button>
        </div>
        <p class="mt-1 text-xs text-slate-400">Use a page address (e.g. about-us), an anchor (#services) or a full URL.</p>
        <div class="mt-4 space-y-3">
          <div v-for="(item, i) in settings.menu" :key="i" class="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3">
            <input
              v-for="l in locales"
              :key="l.code"
              v-model="item.label[l.code]"
              class="input w-36 flex-1"
              :dir="l.dir"
              :placeholder="l.label"
            />
            <input v-model="item.href" class="input w-40 flex-1 font-mono text-xs" dir="ltr" placeholder="#services" />
            <button type="button" class="btn-icon" :disabled="i === 0" @click="settings.menu.splice(i - 1, 0, ...settings.menu.splice(i, 1))">
              <i class="mdi mdi-arrow-up" />
            </button>
            <button type="button" class="btn-icon hover:!text-red-600" @click="settings.menu.splice(i, 1)"><i class="mdi mdi-close" /></button>
          </div>
        </div>
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">Form messages</h2>
        <p class="mt-1 text-xs text-slate-400">
          Every message is kept in the Inbox. To also receive it by email, enter an address; the server needs SMTP_URL set.
        </p>
        <label class="field-label mt-4" for="notify">Email new messages to</label>
        <input id="notify" v-model="settings.notifyEmail" type="email" class="input max-w-sm" dir="ltr" placeholder="you@example.com" />
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">Fonts</h2>
        <p class="mt-1 text-xs text-slate-400">Your own fonts, e.g. a logo typeface. After uploading, pick them in a theme's font lists.</p>
        <div class="mt-4">
          <FontManager v-model="settings.fonts" />
        </div>
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">Page loader</h2>
        <p class="mt-1 text-xs text-slate-400">A screen shown while the site opens, counting up to 100% and then revealing the site name.</p>
        <label class="mt-4 flex items-center gap-2 text-sm">
          <input v-model="settings.loader.enabled" type="checkbox" class="h-4 w-4 rounded" /> Show a loading screen
        </label>
        <div v-if="settings.loader.enabled" class="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label class="field-label" for="loader-style">Style</label>
            <select id="loader-style" v-model="settings.loader.style" class="input">
              <option value="percent">Percentage counter</option>
              <option value="bar">Thin bar at the top</option>
              <option value="name">Site name filling with color</option>
            </select>
          </div>
          <label class="flex items-center gap-2 self-end pb-2 text-sm">
            <input v-model="settings.loader.oncePerSession" type="checkbox" class="h-4 w-4 rounded" /> Only on the first page of a visit
          </label>
          <div v-for="l in locales" :key="l.code">
            <label class="field-label">Line under the counter ({{ l.label }})</label>
            <input v-model="settings.loader.text[l.code]" class="input" :dir="l.dir" maxlength="120" />
          </div>
          <FieldInput v-model="settings.loader.background" :field="imageField('loaderBg', 'Background picture (blurred, sharpening as it loads)')" />
        </div>
        <div v-if="settings.loader.enabled" class="mt-4">
          <button type="button" class="btn-light" @click="loaderPreview++"><i class="mdi mdi-play" /> Preview</button>
          <div v-if="loaderPreview" class="relative mt-3 h-64 overflow-hidden rounded-2xl bg-slate-100">
            <SiteLoader :key="loaderPreview" :loader="settings.loader" :site-name="settings.siteName.en || 'Your site'" locale="en" preview />
            <p class="flex h-full items-center justify-center text-xs text-slate-400">The site appears here.</p>
          </div>
        </div>
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">Maintenance mode</h2>
        <label class="mt-4 flex items-center gap-2 text-sm">
          <input v-model="settings.maintenance" type="checkbox" class="h-4 w-4 rounded" /> Show a “back soon” page to visitors
        </label>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div v-for="l in locales" :key="l.code">
            <label class="field-label">Message ({{ l.label }})</label>
            <textarea v-model="settings.maintenanceText[l.code]" rows="2" class="input" :dir="l.dir" />
          </div>
        </div>
      </section>
    </div>

    <!-- Theme -->
    <aside class="space-y-6">
      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">Site theme</h2>
        <p class="mt-1 text-xs text-slate-400">Used by every page, unless a page has its own theme (set in the page editor's Design panel).</p>
        <div class="mt-5">
          <ThemeEditor
            v-model="(settings.theme as ThemeTokens)"
            compact
            :custom-fonts="customFonts"
            :saved-themes="settings.savedThemes"
            @save-theme="saveTheme"
            @delete-theme="deleteTheme"
          />
        </div>
      </section>

      <!-- Live preview of the theme -->
      <section class="overflow-hidden rounded-[2rem] p-4" :style="{ background: settings.theme.background }">
        <div class="p-6 text-center" :style="{ background: settings.theme.surface, borderRadius: settings.theme.radius, color: settings.theme.text }">
          <p class="text-xl font-black">{{ settings.siteName.en || 'Your site' }}</p>
          <p class="mt-1 text-xs font-light" :style="{ color: settings.theme.muted }">Panel preview</p>
          <div class="mt-4 flex justify-center gap-2">
            <span class="px-4 py-1.5 text-xs text-white" :style="{ background: settings.theme.primary, borderRadius: settings.theme.buttonRadius }">Primary</span>
            <span class="px-4 py-1.5 text-xs text-white" :style="{ background: settings.theme.secondary, borderRadius: settings.theme.buttonRadius }">Secondary</span>
          </div>
        </div>
        <div class="mt-3 p-4 text-center text-xs text-white" :style="{ background: settings.theme.dark, borderRadius: settings.theme.radius }">
          Dark section
        </div>
      </section>
    </aside>
  </div>
</template>
