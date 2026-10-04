<script setup lang="ts">
import { defaultTheme, locales, type FieldDef, type ThemeTokens } from '@profiterol/blocks';
import FieldInput from '~/components/admin/FieldInput.vue';
import type { SiteSettings } from '~/composables/useSite';

definePageMeta({ layout: 'admin', middleware: 'admin' });

const api = useApi();
const settings = ref<(SiteSettings & { notifyEmail: string }) | null>(null);
const saving = ref(false);
const message = ref<{ kind: 'ok' | 'error'; text: string } | null>(null);

const colorFields: { key: keyof ThemeTokens; label: string }[] = [
  { key: 'background', label: 'Page background' },
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'dark', label: 'Dark sections' },
  { key: 'surface', label: 'Panels' },
  { key: 'text', label: 'Text' },
  { key: 'muted', label: 'Muted text' },
];

const imageField = (key: string, label: string): FieldDef => ({ key, label, type: 'image' });

async function load() {
  const s = await api<SiteSettings & { notifyEmail: string }>('/admin/settings');
  s.theme = { ...defaultTheme, ...s.theme };
  for (const l of locales) {
    s.siteName[l.code] ??= '';
    s.maintenanceText[l.code] ??= '';
  }
  settings.value = s;
}

function addMenuItem() {
  settings.value!.menu.push({ label: Object.fromEntries(locales.map((l) => [l.code, ''])), href: '' });
}

async function save() {
  if (!settings.value) return;
  saving.value = true;
  message.value = null;
  try {
    const { siteName, logo, favicon, theme, menu, maintenance, maintenanceText, notifyEmail } = settings.value;
    await api('/admin/settings', {
      method: 'PUT',
      body: { siteName, logo, favicon, theme, menu, maintenance, maintenanceText, notifyEmail },
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
        <h2 class="font-black">Theme</h2>
        <div class="mt-4 space-y-3">
          <div v-for="c in colorFields" :key="c.key" class="flex items-center gap-3">
            <input v-model="settings.theme[c.key]" type="color" class="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 p-1" />
            <span class="flex-1 text-sm">{{ c.label }}</span>
            <code class="text-[11px] text-slate-400">{{ settings.theme[c.key] }}</code>
          </div>
          <div>
            <label class="field-label">Panel corner radius</label>
            <select v-model="settings.theme.radius" class="input">
              <option value="0.5rem">Small</option>
              <option value="1.5rem">Medium</option>
              <option value="2.5rem">Large</option>
              <option value="4rem">Extra large (default)</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="field-label">Persian font</label>
              <input v-model="settings.theme.fontFa" class="input" />
            </div>
            <div>
              <label class="field-label">Latin font</label>
              <input v-model="settings.theme.fontEn" class="input" />
            </div>
          </div>
          <button type="button" class="btn-light w-full" @click="settings.theme = { ...defaultTheme }">Reset to default</button>
        </div>
      </section>

      <!-- Live preview of the theme -->
      <section class="overflow-hidden rounded-[2rem] p-4" :style="{ background: settings.theme.background }">
        <div class="p-6 text-center" :style="{ background: settings.theme.surface, borderRadius: settings.theme.radius, color: settings.theme.text }">
          <p class="text-xl font-black">{{ settings.siteName.en || 'Your site' }}</p>
          <p class="mt-1 text-xs font-light" :style="{ color: settings.theme.muted }">Panel preview</p>
          <div class="mt-4 flex justify-center gap-2">
            <span class="rounded-full px-4 py-1.5 text-xs text-white" :style="{ background: settings.theme.primary }">Primary</span>
            <span class="rounded-full px-4 py-1.5 text-xs text-white" :style="{ background: settings.theme.secondary }">Secondary</span>
          </div>
        </div>
        <div class="mt-3 p-4 text-center text-xs text-white" :style="{ background: settings.theme.dark, borderRadius: settings.theme.radius }">
          Dark section
        </div>
      </section>
    </aside>
  </div>
</template>
