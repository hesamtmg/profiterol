<script setup lang="ts">
/**
 * The visual page editor: block library on the left, live canvas in the middle,
 * property panel on the right. Blocks render with the same components as the public site.
 */
import {
  blocks as blockDefs,
  createBlock,
  getBlock,
  getLocale,
  locales,
  defaultTheme,
  resolveTheme,
  themeFontsHref,
  themeToCss,
  type ThemeTokens,
  withDefaults as mergeDefaults,
  type BlockCategory,
  type BlockDef,
  type BlockNode,
} from '@profiterol/blocks';
import draggable from 'vuedraggable';
import FieldInput from '~/components/admin/FieldInput.vue';
import ThemeEditor from '~/components/admin/ThemeEditor.vue';
import type { AdminPage, AdminTranslation } from '~/composables/useAdminTypes';
import type { SiteSettings } from '~/composables/useSite';

definePageMeta({ layout: false, middleware: 'admin' });

type Draft = Pick<AdminTranslation, 'locale' | 'title' | 'slug' | 'seoTitle' | 'seoDescription' | 'blocks'>;

const route = useRoute();
const api = useApi();

const page = ref<AdminPage | null>(null);
const settings = ref<SiteSettings | null>(null);
const name = ref('');
const isHome = ref(false);
const drafts = reactive<Record<string, Draft>>({});
const locale = ref(locales[0].code);
const device = ref<'desktop' | 'tablet' | 'mobile'>('desktop');
const selectedId = ref<string | null>(null);
const leftTab = ref<'add' | 'layers' | 'design'>('add');
const { user } = useAuth();

// ---------- Theme ----------
// The site theme (shared by every page) and this page's own changes (null = uses the site theme).
const siteTheme = ref<ThemeTokens>({ ...defaultTheme });
const savedSiteTheme = ref('');
const pageTheme = ref<Partial<ThemeTokens> | null>(null);
const isAdmin = computed(() => user.value?.role === 'admin');
/** What the canvas shows: the site theme with this page's changes on top. */
const canvasTheme = computed(() => resolveTheme(siteTheme.value, pageTheme.value));
const themeMode = computed<'site' | 'page'>(() => (pageTheme.value ? 'page' : 'site'));
/** The theme being edited in the Design panel. */
const editedTheme = computed<ThemeTokens>({
  get: () => (themeMode.value === 'page' ? canvasTheme.value : siteTheme.value),
  set: (value) => {
    if (themeMode.value === 'page') pageTheme.value = { ...value };
    else siteTheme.value = { ...value };
  },
});
function setThemeMode(mode: 'site' | 'page') {
  // A page's own theme starts as a copy of the site theme.
  pageTheme.value = mode === 'page' ? { ...canvasTheme.value } : null;
}
const savedSnapshot = ref('');
const saving = ref(false);
const message = ref<{ kind: 'error' | 'ok'; text: string } | null>(null);

const current = computed(() => drafts[locale.value]);
const localeDir = computed(() => getLocale(locale.value)?.dir ?? 'ltr');
const selected = computed(() => current.value?.blocks.find((b) => b.id === selectedId.value) ?? null);
const selectedDef = computed(() => (selected.value ? getBlock(selected.value.type) : undefined));
const themeCss = computed(() => themeToCss(canvasTheme.value));
const overlayHeader = computed(() => current.value?.blocks[0]?.type === 'spotlight');

const deviceWidths = { desktop: '100%', tablet: '820px', mobile: '390px' } as const;
const categories: { key: BlockCategory; label: string }[] = [
  { key: 'hero', label: 'Hero' },
  { key: 'cards', label: 'Cards' },
  { key: 'content', label: 'Content' },
  { key: 'media', label: 'Media' },
  { key: 'contact', label: 'Contact' },
];

// ---------- Loading & saving ----------

function snapshot() {
  return JSON.stringify({ name: name.value, isHome: isHome.value, drafts, pageTheme: pageTheme.value, siteTheme: siteTheme.value });
}
const dirty = computed(() => savedSnapshot.value !== '' && snapshot() !== savedSnapshot.value);

function fromPage(p: AdminPage) {
  page.value = p;
  name.value = p.name;
  isHome.value = p.isHome;
  pageTheme.value = p.theme ? { ...p.theme } : null;
  for (const l of locales) {
    const t = p.translations.find((x) => x.locale === l.code);
    drafts[l.code] = {
      locale: l.code,
      title: t?.title ?? p.name,
      slug: t?.slug ?? '',
      seoTitle: t?.seoTitle ?? '',
      seoDescription: t?.seoDescription ?? '',
      // Fill in any props added to a block since it was saved, so every field has a value to edit.
      blocks: (t?.blocks ?? []).map((b) => ({ ...b, props: mergeDefaults(b) })),
    };
  }
  savedSnapshot.value = snapshot();
  resetHistory();
}

async function load() {
  try {
    const [p, s] = await Promise.all([
      api<AdminPage>(`/admin/pages/${route.params.id}`),
      api<SiteSettings>('/public/settings'),
    ]);
    settings.value = s;
    siteTheme.value = resolveTheme(s.theme);
    savedSiteTheme.value = JSON.stringify(siteTheme.value);
    fromPage(p);
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  }
}

async function save() {
  if (!page.value || saving.value) return false;
  saving.value = true;
  message.value = null;
  // Changes typed while the request is in flight stay unsaved.
  const sent = snapshot();
  try {
    const updated = await api<AdminPage>(`/admin/pages/${page.value.id}`, {
      method: 'PATCH',
      body: {
        name: name.value,
        isHome: isHome.value,
        theme: pageTheme.value,
        translations: locales.map((l) => {
          const d = drafts[l.code];
          return { locale: d.locale, title: d.title, slug: d.slug, seoTitle: d.seoTitle, seoDescription: d.seoDescription, blocks: d.blocks };
        }),
      },
    });
    // The site theme is shared by every page, so only admins can change it.
    const siteJson = JSON.stringify(siteTheme.value);
    if (siteJson !== savedSiteTheme.value) {
      await api('/admin/settings', { method: 'PUT', body: { theme: siteTheme.value } });
      savedSiteTheme.value = siteJson;
    }
    page.value = updated;
    savedSnapshot.value = sent;
    message.value = { kind: 'ok', text: 'Saved' };
    return true;
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
    return false;
  } finally {
    saving.value = false;
  }
}

const autosave = useAutosave({ snapshot, dirty, busy: saving, save });

/** Text typed directly on the canvas. */
function inlineEdit(block: BlockNode, path: string, value: string) {
  setAtPath(block.props, path, value);
}

/** True when the block is set to hide on the device being previewed. */
function hiddenOnDevice(block: BlockNode) {
  const showOn = block.props.showOn;
  return (showOn === 'mobile' && device.value !== 'mobile') || (showOn === 'desktop' && device.value === 'mobile');
}

// ---------- Dropping an image file onto a block ----------

const { upload, uploading, error: uploadError } = useUpload();
const dropTarget = ref<string | null>(null);
let dropTimer: ReturnType<typeof setTimeout> | undefined;

/** The first top-level image field of a block, which a dropped photo replaces (or video field, for a video). */
function imageFieldOf(block: BlockNode, kind: 'image' | 'video' = 'image') {
  return getBlock(block.type)?.fields.find((f) => f.type === kind);
}

/** What kind of file is being dragged, from its MIME type (readable during dragover). */
function draggedKind(e: DragEvent): 'image' | 'video' | null {
  const type = Array.from(e.dataTransfer?.items ?? []).find((i) => i.kind === 'file')?.type ?? '';
  return type.startsWith('video/') ? 'video' : type.startsWith('image/') ? 'image' : null;
}

const dropKind = ref<'image' | 'video'>('image');

function onBlockDragOver(block: BlockNode, e: DragEvent) {
  const kind = draggedKind(e) ?? 'image';
  if (!imageFieldOf(block, kind) || !Array.from(e.dataTransfer?.types ?? []).includes('Files')) return;
  e.preventDefault();
  dropKind.value = kind;
  dropTarget.value = block.id;
  // dragover repeats while the file is over the block; when it stops, the file has left.
  clearTimeout(dropTimer);
  dropTimer = setTimeout(() => (dropTarget.value = null), 200);
}

async function onBlockDrop(block: BlockNode, e: DragEvent) {
  const file = mediaFrom(e.dataTransfer, 'video') ?? imageFrom(e.dataTransfer);
  const field = file && imageFieldOf(block, file.type.startsWith('video/') ? 'video' : 'image');
  dropTarget.value = null;
  if (!field || !file) return;
  e.preventDefault();
  select(block.id);
  const media = await upload(file);
  if (media) block.props[field.key] = media.url;
  else message.value = { kind: 'error', text: uploadError.value };
}

async function publish() {
  if (dirty.value && !(await save())) return;
  try {
    page.value = await api<AdminPage>(`/admin/pages/${page.value!.id}/publish`, { method: 'POST' });
    message.value = { kind: 'ok', text: 'Published' };
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  }
}

/** True when the saved draft differs from what visitors currently see. */
const hasUnpublished = computed(
  () =>
    page.value?.status !== 'published' ||
    page.value.translations.some((t) => JSON.stringify(t.blocks) !== JSON.stringify(t.publishedBlocks)) ||
    JSON.stringify(page.value.theme ?? null) !== JSON.stringify(page.value.publishedTheme ?? null),
);

const liveUrl = computed(() => {
  const d = current.value;
  if (!d) return '/';
  return isHome.value ? `/${d.locale}` : `/${d.locale}/${d.slug}`;
});

// ---------- Undo / redo (per language) ----------

const history: Record<string, { past: string[]; future: string[]; last: string }> = {};
let applyingHistory = false;
let historyTimer: ReturnType<typeof setTimeout> | undefined;

function resetHistory() {
  for (const l of locales) {
    history[l.code] = { past: [], future: [], last: JSON.stringify(drafts[l.code]?.blocks ?? []) };
  }
}

watch(
  () => [locale.value, JSON.stringify(current.value?.blocks ?? [])] as const,
  ([code, json]) => {
    if (applyingHistory || !history[code]) return;
    clearTimeout(historyTimer);
    historyTimer = setTimeout(() => {
      const h = history[code];
      if (json === h.last) return;
      h.past.push(h.last);
      if (h.past.length > 100) h.past.shift();
      h.future = [];
      h.last = json;
      historyTick.value++;
    }, 350);
  },
);

const historyTick = ref(0);
const canUndo = computed(() => (historyTick.value, (history[locale.value]?.past.length ?? 0) > 0));
const canRedo = computed(() => (historyTick.value, (history[locale.value]?.future.length ?? 0) > 0));

function applyHistory(json: string) {
  applyingHistory = true;
  current.value.blocks = JSON.parse(json);
  history[locale.value].last = json;
  historyTick.value++;
  nextTick(() => (applyingHistory = false));
}

function undo() {
  const h = history[locale.value];
  if (!h?.past.length) return;
  h.future.push(JSON.stringify(current.value.blocks));
  applyHistory(h.past.pop()!);
}

function redo() {
  const h = history[locale.value];
  if (!h?.future.length) return;
  h.past.push(JSON.stringify(current.value.blocks));
  applyHistory(h.future.pop()!);
}

// ---------- Block operations ----------

function indexOf(id: string) {
  return current.value.blocks.findIndex((b) => b.id === id);
}

function insertBlock(def: BlockDef) {
  const node = createBlock(def.type);
  const at = selectedId.value ? indexOf(selectedId.value) + 1 : current.value.blocks.length;
  current.value.blocks.splice(at, 0, node);
  select(node.id, true);
}

function cloneFromLibrary(def: BlockDef): BlockNode {
  return createBlock(def.type);
}

function onCanvasAdd(evt: { newIndex: number }) {
  const node = current.value.blocks[evt.newIndex];
  if (node) select(node.id);
}

function move(id: string, delta: number) {
  const i = indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= current.value.blocks.length) return;
  const [node] = current.value.blocks.splice(i, 1);
  current.value.blocks.splice(j, 0, node);
}

function duplicate(id: string) {
  const i = indexOf(id);
  const copy = { ...createBlock(current.value.blocks[i].type), props: JSON.parse(JSON.stringify(current.value.blocks[i].props)) };
  current.value.blocks.splice(i + 1, 0, copy);
  select(copy.id, true);
}

function remove(id: string) {
  const i = indexOf(id);
  if (i < 0) return;
  current.value.blocks.splice(i, 1);
  if (selectedId.value === id) selectedId.value = null;
}

function select(id: string, scroll = false) {
  selectedId.value = id;
  if (scroll) nextTick(() => document.getElementById(`blk-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}

/** Copies the block layout (with its text) from another language, as a starting point for translating. */
function copyFrom(code: string) {
  if (current.value.blocks.length && !confirm('Replace the blocks in this language?')) return;
  current.value.blocks = drafts[code].blocks.map((b) => ({ ...createBlock(b.type), props: JSON.parse(JSON.stringify(b.props)) }));
  selectedId.value = null;
}

/** Links inside the canvas should not navigate away from the editor. */
function blockLinks(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('a')) e.preventDefault();
}

// ---------- Keyboard & leaving ----------

function onKey(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey;
  const typing = (e.target as HTMLElement).closest('input, textarea, select, [contenteditable]');
  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save();
  } else if (mod && !typing && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  } else if (mod && !typing && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
  } else if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && selectedId.value) {
    remove(selectedId.value);
  } else if (e.key === 'Escape') {
    selectedId.value = null;
  }
}

function beforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value) e.preventDefault();
}

onBeforeRouteLeave(() => (dirty.value ? confirm('You have unsaved changes. Leave anyway?') : true));

watch(locale, () => (selectedId.value = null));

onMounted(() => {
  load();
  window.addEventListener('keydown', onKey);
  window.addEventListener('beforeunload', beforeUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('beforeunload', beforeUnload);
});

useHead(() => ({
  title: `${name.value || 'Page'} · Editor`,
  htmlAttrs: { lang: 'en', dir: 'ltr' },
  // Load the theme's fonts so the canvas shows them while editing.
  link: [{ rel: 'stylesheet', href: themeFontsHref(canvasTheme.value) }],
}));
</script>

<template>
  <div class="admin-ui flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-800">
    <!-- Top bar -->
    <header class="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3">
      <NuxtLink to="/admin" class="btn-icon" title="Back to pages"><i class="mdi mdi-arrow-left text-lg" /></NuxtLink>
      <input v-model="name" class="w-44 rounded-lg px-2 py-1 text-sm font-bold outline-none hover:bg-slate-50 focus:bg-slate-50" aria-label="Page name" />

      <div class="flex rounded-full bg-slate-100 p-1" role="tablist" aria-label="Language">
        <button
          v-for="l in locales"
          :key="l.code"
          type="button"
          class="rounded-full px-3 py-1 text-xs font-medium transition"
          :class="locale === l.code ? 'bg-white shadow-sm' : 'text-slate-500'"
          @click="locale = l.code"
        >
          {{ l.label }}
        </button>
      </div>

      <div class="mx-auto flex rounded-full bg-slate-100 p-1" aria-label="Preview size">
        <button
          v-for="d in (['desktop', 'tablet', 'mobile'] as const)"
          :key="d"
          type="button"
          class="flex h-7 w-9 items-center justify-center rounded-full transition"
          :class="device === d ? 'bg-white shadow-sm' : 'text-slate-500'"
          :title="d"
          @click="device = d"
        >
          <i class="mdi" :class="{ desktop: 'mdi-monitor', tablet: 'mdi-tablet', mobile: 'mdi-cellphone' }[d]" />
        </button>
      </div>

      <button type="button" class="btn-icon" title="Undo (Ctrl+Z)" :disabled="!canUndo" @click="undo"><i class="mdi mdi-undo text-lg" /></button>
      <button type="button" class="btn-icon" title="Redo (Ctrl+Shift+Z)" :disabled="!canRedo" @click="redo"><i class="mdi mdi-redo text-lg" /></button>

      <label class="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500" title="Save automatically a few seconds after each change">
        <input v-model="autosave.enabled.value" type="checkbox" class="h-3.5 w-3.5 rounded" /> Autosave
      </label>
      <span class="w-36 text-end text-xs" :class="message?.kind === 'error' ? 'text-red-600' : 'text-slate-400'">
        <template v-if="saving || uploading">{{ uploading ? 'Uploading…' : 'Saving…' }}</template>
        <template v-else-if="dirty">Unsaved changes</template>
        <template v-else-if="hasUnpublished && autosave.lastSavedAt.value">
          Saved {{ autosave.lastSavedAt.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }} · not live
        </template>
        <template v-else-if="hasUnpublished">Saved · not live</template>
        <template v-else>Live</template>
      </span>
      <a :href="liveUrl" target="_blank" class="btn-light" :class="{ 'pointer-events-none opacity-40': page?.status !== 'published' }">
        <i class="mdi mdi-eye-outline" /> View
      </a>
      <button type="button" class="btn-light" :disabled="saving || !dirty" @click="save">Save</button>
      <button type="button" class="btn-dark !bg-[#00a998] hover:!brightness-110" :disabled="saving" @click="publish">
        <i class="mdi mdi-rocket-launch-outline" /> Publish
      </button>
    </header>

    <p
      v-if="message?.kind === 'error'"
      class="relative z-10 whitespace-pre-line border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700"
    >
      {{ message.text }}
      <button type="button" class="absolute end-3 top-2" @click="message = null"><i class="mdi mdi-close" /></button>
    </p>

    <div v-if="current" class="flex min-h-0 flex-1">
      <!-- Left: block library & layers -->
      <aside class="flex w-72 shrink-0 flex-col border-e border-slate-200 bg-white">
        <div class="flex gap-1 p-2">
          <button
            v-for="tab in (['add', 'layers', 'design'] as const)"
            :key="tab"
            type="button"
            class="flex-1 rounded-full py-1.5 text-xs font-medium transition"
            :class="leftTab === tab ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'"
            @click="leftTab = tab"
          >
            {{ tab === 'add' ? 'Add blocks' : tab === 'layers' ? `Layers (${current.blocks.length})` : 'Design' }}
          </button>
        </div>

        <div v-if="leftTab === 'add'" class="flex-1 overflow-y-auto px-3 pb-6">
          <p class="px-1 pb-2 text-[11px] text-slate-400">Click to insert below the selected block, or drag onto the page.</p>
          <div v-for="cat in categories" :key="cat.key" class="mt-3">
            <h3 class="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{{ cat.label }}</h3>
            <draggable
              :list="blockDefs.filter((b) => b.category === cat.key)"
              :group="{ name: 'blocks', pull: 'clone', put: false }"
              :clone="cloneFromLibrary"
              :sort="false"
              item-key="type"
              class="mt-2 grid grid-cols-2 gap-2"
            >
              <template #item="{ element }">
                <button
                  type="button"
                  class="flex cursor-grab flex-col items-center gap-1.5 rounded-2xl border border-slate-200 p-3 text-center text-[11px] leading-tight transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:cursor-grabbing"
                  :title="element.description"
                  @click="insertBlock(element)"
                >
                  <i class="mdi text-2xl text-[#00a998]" :class="element.icon" />
                  {{ element.label }}
                </button>
              </template>
            </draggable>
          </div>
        </div>

        <div v-else-if="leftTab === 'design'" class="flex-1 overflow-y-auto px-4 pb-8">
          <div class="rounded-2xl bg-slate-50 p-3">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">This page uses</p>
            <div class="mt-2 flex rounded-full bg-white p-1 text-xs shadow-sm">
              <button
                v-for="m in ([{ value: 'site', label: 'Site theme' }, { value: 'page', label: 'Its own theme' }] as const)"
                :key="m.value"
                type="button"
                class="flex-1 rounded-full py-1.5 font-medium transition"
                :class="themeMode === m.value ? 'bg-slate-900 text-white' : 'text-slate-500'"
                @click="setThemeMode(m.value)"
              >
                {{ m.label }}
              </button>
            </div>
            <p class="mt-2 text-[11px] leading-relaxed text-slate-500">
              <template v-if="themeMode === 'site'">
                Changes here apply to <b>every page</b> that uses the site theme, as soon as you save.
                <span v-if="!isAdmin" class="text-amber-700">Only admins can change the site theme.</span>
              </template>
              <template v-else>Changes apply to this page only and go live when you publish.</template>
            </p>
          </div>
          <fieldset class="mt-5" :disabled="themeMode === 'site' && !isAdmin" :class="{ 'opacity-50': themeMode === 'site' && !isAdmin }">
            <ThemeEditor v-model="editedTheme" compact />
          </fieldset>
        </div>

        <div v-else class="flex-1 overflow-y-auto px-3 pb-6">
          <draggable v-model="current.blocks" item-key="id" handle=".layer-handle" :animation="200" class="space-y-1.5">
            <template #item="{ element }">
              <div
                class="flex items-center gap-2 rounded-xl border px-2 py-2 text-xs transition"
                :class="selectedId === element.id ? 'border-sky-400 bg-sky-50' : 'border-slate-200 hover:bg-slate-50'"
                @click="select(element.id, true)"
              >
                <i class="layer-handle mdi mdi-drag cursor-grab text-lg text-slate-400" />
                <i class="mdi text-base text-slate-500" :class="getBlock(element.type)?.icon" />
                <span class="flex-1 truncate">{{ getBlock(element.type)?.label ?? element.type }}</span>
              </div>
            </template>
          </draggable>
          <p v-if="!current.blocks.length" class="py-8 text-center text-xs text-slate-400">No blocks yet.</p>
        </div>
      </aside>

      <!-- Middle: live canvas -->
      <main class="min-w-0 flex-1 overflow-y-auto p-4" @click.self="selectedId = null">
        <div
          class="site @container relative mx-auto min-h-full pb-3 transition-[width] duration-500"
          :class="device === 'desktop' ? '' : 'overflow-hidden rounded-[2rem] shadow-2xl ring-8 ring-slate-800'"
          :style="`width:${deviceWidths[device]};${themeCss}`"
          :dir="localeDir"
          :lang="locale"
          @click.capture="blockLinks"
        >
          <SiteHeader
            :site-name="settings?.siteName?.[locale] ?? ''"
            :logo="settings?.logo"
            :menu="settings?.menu ?? []"
            :locale="locale"
            :overlay="overlayHeader"
            :glass="canvasTheme.headerStyle === 'glass'"
            class="pointer-events-none"
            :class="overlayHeader ? '' : '!static'"
          />
          <draggable
            v-model="current.blocks"
            item-key="id"
            group="blocks"
            handle=".drag-handle"
            :animation="250"
            ghost-class="opacity-40"
            class="min-h-[60vh]"
            @add="onCanvasAdd"
          >
            <template #item="{ element }">
              <div
                :id="`blk-${element.id}`"
                class="group/blk relative cursor-pointer outline-offset-[-4px]"
                :class="selectedId === element.id ? 'z-10 outline outline-4 outline-sky-500' : 'hover:outline hover:outline-2 hover:outline-sky-400/70'"
                @click="select(element.id)"
                @dragover="onBlockDragOver(element, $event)"
                @drop="onBlockDrop(element, $event)"
              >
                <div
                  class="absolute start-6 top-6 z-20 items-center gap-0.5 rounded-full bg-slate-900 p-1 text-white shadow-xl"
                  :class="selectedId === element.id ? 'flex' : 'hidden group-hover/blk:flex'"
                  dir="ltr"
                  @click.stop="select(element.id)"
                >
                  <span class="drag-handle flex cursor-grab items-center gap-1 px-2 text-xs font-medium" title="Drag to move">
                    <i class="mdi mdi-drag text-base" /> {{ getBlock(element.type)?.label }}
                  </span>
                  <button type="button" class="btn-icon !h-7 !w-7 !text-white hover:!bg-white/15" title="Move up" @click="move(element.id, -1)"><i class="mdi mdi-arrow-up" /></button>
                  <button type="button" class="btn-icon !h-7 !w-7 !text-white hover:!bg-white/15" title="Move down" @click="move(element.id, 1)"><i class="mdi mdi-arrow-down" /></button>
                  <button type="button" class="btn-icon !h-7 !w-7 !text-white hover:!bg-white/15" title="Duplicate" @click="duplicate(element.id)"><i class="mdi mdi-content-copy" /></button>
                  <button type="button" class="btn-icon !h-7 !w-7 !text-white hover:!bg-red-500" title="Delete" @click="remove(element.id)"><i class="mdi mdi-trash-can-outline" /></button>
                </div>
                <span
                  v-if="element.props.showOn"
                  class="absolute end-6 top-6 z-20 rounded-full bg-amber-300 px-3 py-1 text-[11px] font-medium text-amber-950 shadow"
                  dir="ltr"
                >
                  <i class="mdi" :class="element.props.showOn === 'mobile' ? 'mdi-cellphone' : 'mdi-monitor'" />
                  {{ element.props.showOn === 'mobile' ? 'Phones only' : 'Tablets and desktops only' }}
                </span>
                <div :class="{ 'opacity-30 grayscale': hiddenOnDevice(element) }">
                  <BlockView :block="element" :locale="locale" editable @edit="(path, value) => inlineEdit(element, path, value)" />
                </div>
                <div
                  v-if="dropTarget === element.id"
                  class="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-card border-4 border-dashed border-sky-400 bg-sky-500/20 text-lg font-bold text-white"
                  dir="ltr"
                >
                  <span class="rounded-full bg-sky-600 px-5 py-2 shadow-lg"><i class="mdi" :class="dropKind === 'video' ? 'mdi-movie-plus' : 'mdi-image-plus'" /> Drop to use as {{ imageFieldOf(element, dropKind)?.label.toLowerCase() }}</span>
                </div>
                <button
                  type="button"
                  class="absolute bottom-0 left-1/2 z-20 hidden h-8 w-8 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg group-hover/blk:flex"
                  title="Add a block below"
                  @click.stop="(select(element.id), (leftTab = 'add'))"
                >
                  <i class="mdi mdi-plus" />
                </button>
              </div>
            </template>
            <template #footer>
              <div
                v-if="!current.blocks.length"
                class="mx-6 mt-6 flex h-64 flex-col items-center justify-center rounded-card border-4 border-dashed border-white/50 text-white"
                dir="ltr"
              >
                <i class="mdi mdi-gesture-tap-hold text-4xl" />
                <p class="mt-2 text-sm">Drag a block here, or click one on the left.</p>
              </div>
            </template>
          </draggable>
        </div>
      </main>

      <!-- Right: properties -->
      <aside class="w-80 shrink-0 overflow-y-auto border-s border-slate-200 bg-white">
        <template v-if="selected && selectedDef">
          <div class="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 bg-white px-5 py-4">
            <i class="mdi text-xl text-[#00a998]" :class="selectedDef.icon" />
            <div class="min-w-0 flex-1">
              <h2 class="text-sm font-black">{{ selectedDef.label }}</h2>
              <p class="truncate text-[11px] text-slate-400" :title="selectedDef.description">{{ selectedDef.description }}</p>
            </div>
            <button type="button" class="btn-icon" title="Close" @click="selectedId = null"><i class="mdi mdi-close" /></button>
          </div>
          <div class="space-y-4 px-5 py-5">
            <FieldInput
              v-for="field in selectedDef.fields"
              :key="`${selected.id}-${field.key}`"
              v-model="selected.props[field.key]"
              :field="field"
              :dir="localeDir"
            />
          </div>
          <div class="flex gap-2 border-t border-slate-100 px-5 py-4">
            <button type="button" class="btn-light flex-1" @click="duplicate(selected.id)"><i class="mdi mdi-content-copy" /> Duplicate</button>
            <button type="button" class="btn-light flex-1 !text-red-600" @click="remove(selected.id)"><i class="mdi mdi-trash-can-outline" /> Delete</button>
          </div>
        </template>

        <template v-else>
          <div class="border-b border-slate-100 px-5 py-4">
            <h2 class="text-sm font-black">Page settings</h2>
            <p class="text-[11px] text-slate-400">Select a block on the page to edit it.</p>
          </div>
          <div class="space-y-4 px-5 py-5">
            <label class="flex items-center gap-2 text-sm">
              <input v-model="isHome" type="checkbox" class="h-4 w-4 rounded" /> Use as home page
            </label>
            <div class="rounded-2xl bg-slate-50 p-4">
              <p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {{ getLocale(locale)?.label }} version
              </p>
              <div class="space-y-3">
                <div>
                  <label class="field-label">Title</label>
                  <input v-model="current.title" class="input" :dir="localeDir" />
                </div>
                <div>
                  <label class="field-label">Address</label>
                  <div class="flex items-center gap-1 text-xs text-slate-400" dir="ltr">
                    <span class="shrink-0 whitespace-nowrap">/{{ locale }}/</span><input v-model="current.slug" class="input font-mono text-xs" />
                  </div>
                </div>
                <div>
                  <label class="field-label">SEO title</label>
                  <input v-model="current.seoTitle" class="input" :dir="localeDir" :placeholder="current.title" />
                </div>
                <div>
                  <label class="field-label">SEO description</label>
                  <textarea v-model="current.seoDescription" rows="3" class="input" :dir="localeDir" />
                </div>
              </div>
            </div>
            <div v-for="l in locales.filter((x) => x.code !== locale)" :key="l.code">
              <button type="button" class="btn-light w-full" :disabled="!drafts[l.code]?.blocks.length" @click="copyFrom(l.code)">
                <i class="mdi mdi-content-duplicate" /> Copy blocks from {{ l.label }}
              </button>
            </div>
            <p class="text-[11px] leading-relaxed text-slate-400">
              Click any text on the page to edit it there. Drop a photo onto a block to use it as that block’s image.
            </p>
            <p class="text-[11px] leading-relaxed text-slate-400">
              Shortcuts: Ctrl+S save · Ctrl+Z undo · Ctrl+Shift+Z redo · Delete removes the selected block · Esc deselects.
            </p>
          </div>
        </template>
      </aside>
    </div>

    <div v-else class="flex flex-1 items-center justify-center text-sm text-slate-400">Loading…</div>
  </div>
</template>
