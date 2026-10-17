<script setup lang="ts">
import {
  cleanBusiness,
  cleanHeader,
  cleanLoader,
  cleanSeo,
  fontNames,
  locales,
  resolveTheme,
  type BusinessInfo,
  type FieldDef,
  type HeaderSettings,
  type LoaderSettings,
  type LoaderStyle,
  type SeoSettings,
  type ThemeTokens,
} from '@profiterol/blocks';
import BusinessPicker from '~/components/admin/BusinessPicker.vue';
import FieldInput from '~/components/admin/FieldInput.vue';
import FontManager from '~/components/admin/FontManager.vue';
import LinkInput from '~/components/admin/LinkInput.vue';
import SiteLoader from '~/components/site/SiteLoader.vue';
import SiteTemplates from '~/components/admin/SiteTemplates.vue';
import ThemeEditor from '~/components/admin/ThemeEditor.vue';
import type { SiteSettings } from '~/composables/useSite';

definePageMeta({ layout: 'admin', middleware: 'admin' });

const api = useApi();
const settings = ref<
  (SiteSettings & { notifyEmail: string; loader: LoaderSettings; business: BusinessInfo; seo: SeoSettings; header: HeaderSettings }) | null
>(null);
const customFonts = computed(() => fontNames(settings.value?.fonts));
const loaderPreview = ref(0);
const saving = ref(false);
const message = ref<{ kind: 'ok' | 'error'; text: string } | null>(null);

const loaderStyleOptions: { value: LoaderStyle; label: string }[] = [
  { value: 'percent', label: 'Percentage counter' },
  { value: 'bar', label: 'Thin bar at the top' },
  { value: 'name', label: 'Site name filling with color' },
  { value: 'logo', label: 'Logo with a filling ring' },
  { value: 'spinner', label: 'Spinning ring' },
  { value: 'dots', label: 'Bouncing dots' },
  { value: 'pulse', label: 'Pulsing circles' },
  { value: 'typing', label: 'Site name typed letter by letter' },
  { value: 'curtain', label: 'Curtain opening on the site' },
];

const cssPlaceholder = '.site h1 {\n  letter-spacing: -0.02em;\n}';

const imageField = (key: string, label: string): FieldDef => ({ key, label, type: 'image' });

async function load() {
  const s = await api<SiteSettings & { notifyEmail: string }>('/admin/settings');
  s.fonts ??= [];
  s.savedThemes ??= [];
  s.theme = resolveTheme(s.theme, null, fontNames(s.fonts));
  const loader = cleanLoader(s.loader);
  const header = cleanHeader(s.header);
  for (const l of locales) {
    header.ctaLabel[l.code] ??= '';
    header.place[l.code] ??= '';
    s.siteName[l.code] ??= '';
    s.maintenanceText[l.code] ??= '';
    loader.text[l.code] ??= '';
  }
  s.defaultLocale ??= '';
  s.customCss ??= '';
  const seo = cleanSeo(s.seo);
  for (const l of locales) {
    seo.titleTemplate[l.code] ??= '';
    seo.description[l.code] ??= '';
  }
  settings.value = { ...s, loader, header, business: cleanBusiness(s.business), seo };
}

/** Saved themes are kept with the other settings and stored with "Save settings". */
function saveTheme(name: string) {
  const list = settings.value!.savedThemes;
  const key = `${
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'theme'
  }-${Date.now().toString(36)}`.slice(0, 40);
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
    const {
      siteName,
      logo,
      favicon,
      theme,
      menu,
      header,
      maintenance,
      maintenanceText,
      notifyEmail,
      fonts,
      savedThemes,
      loader,
      business,
      seo,
      defaultLocale,
      customCss,
    } = settings.value;
    await api('/admin/settings', {
      method: 'PUT',
      body: {
        siteName,
        logo,
        favicon,
        theme,
        menu,
        header,
        maintenance,
        maintenanceText,
        notifyEmail,
        fonts,
        savedThemes,
        loader,
        business,
        seo,
        defaultLocale,
        customCss,
      },
    });
    message.value = { kind: 'ok', text: translate('Settings saved') };
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
          <h1 class="text-3xl font-black">{{ $t('Site settings') }}</h1>
          <p class="mt-1 text-sm font-light text-slate-500">{{ $t('Name, menu and theme for the whole site.') }}</p>
        </div>
        <button type="button" class="btn-dark" :disabled="saving" @click="save">{{ $t(saving ? 'Saving…' : 'Save settings') }}</button>
      </div>
      <p
        v-if="message"
        class="whitespace-pre-line rounded-2xl px-4 py-3 text-sm"
        :class="message.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'"
      >
        {{ message.text }}
      </p>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">{{ $t('Identity') }}</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div v-for="l in locales" :key="l.code">
            <label class="field-label">{{ $t('Site name ({lang})', { lang: l.label }) }}</label>
            <input v-model="settings.siteName[l.code]" class="input" :dir="l.dir" />
          </div>
          <FieldInput v-model="settings.logo" :field="imageField('logo', $t('Logo'))" />
          <FieldInput v-model="settings.favicon" :field="imageField('favicon', $t('Favicon'))" />
        </div>
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">{{ $t('Site language') }}</h2>
        <p class="mt-1 text-xs text-slate-400">
          {{
            $t(
              'The language visitors see the first time they open the site’s address. If they switch languages on the site, their choice is remembered for next time.',
            )
          }}
        </p>
        <select v-model="settings.defaultLocale" class="input mt-4 max-w-sm" data-testid="site-default-locale">
          <option v-for="l in locales" :key="l.code" :value="l.code">{{ l.label }}</option>
          <option value="">{{ $t('Each visitor’s browser language') }}</option>
        </select>
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">{{ $t('Business') }}</h2>
        <p class="mt-1 text-xs text-slate-400">
          {{ $t('What this site is for. Google uses it for business results and maps, so pick the closest kind.') }}
        </p>
        <div class="mt-4">
          <BusinessPicker v-model="settings.business" />
        </div>
      </section>

      <section id="seo" class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">{{ $t('Search engines (SEO)') }}</h2>
        <p class="mt-1 text-xs text-slate-400">
          {{ $t('How this site appears in Google and when shared. Each page can also have its own title, description and picture.') }}
        </p>
        <label class="mt-4 flex items-center gap-2 text-sm">
          <input v-model="settings.seo.hideSite" type="checkbox" class="h-4 w-4 rounded" />
          {{ $t('Hide the whole site from search engines (while it is being built)') }}
        </label>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div v-for="l in locales" :key="`t-${l.code}`">
            <label class="field-label">{{ $t('Title pattern ({lang})', { lang: l.label }) }}</label>
            <input v-model="settings.seo.titleTemplate[l.code]" class="input" :dir="l.dir" placeholder="%s · {site}" maxlength="120" />
            <p class="mt-1 text-[11px] text-slate-400">{{ $t('%s is the page title, {site} the site name.') }}</p>
          </div>
          <div v-for="l in locales" :key="`d-${l.code}`">
            <label class="field-label">{{ $t('Default description ({lang})', { lang: l.label }) }}</label>
            <textarea v-model="settings.seo.description[l.code]" rows="2" class="input" :dir="l.dir" maxlength="300" />
            <p class="mt-1 text-[11px]" :class="settings.seo.description[l.code].length > 160 ? 'text-amber-600' : 'text-slate-400'">
              {{ $t('{n} of about 160 characters', { n: settings.seo.description[l.code].length }) }}
            </p>
          </div>
          <FieldInput v-model="settings.seo.shareImage" :field="imageField('shareImage', $t('Default picture when shared (1200×630)'))" />
          <div>
            <label class="field-label" for="seo-twitter">{{ $t('X (Twitter) account') }}</label>
            <input id="seo-twitter" v-model="settings.seo.twitter" class="input" dir="ltr" placeholder="yoursite" />
          </div>
        </div>
        <h3 class="mt-6 text-sm font-bold">{{ $t('Search console verification') }}</h3>
        <p class="mt-1 text-xs text-slate-400">{{ $t('Paste only the code (content="…") the console gives you.') }}</p>
        <div class="mt-3 grid gap-4 sm:grid-cols-2">
          <div v-for="v in ['google', 'bing', 'yandex', 'baidu'] as const" :key="v">
            <label class="field-label capitalize">{{ v }}</label>
            <input v-model="settings.seo.verification[v]" class="input font-mono text-xs" dir="ltr" />
          </div>
        </div>
        <h3 class="mt-6 text-sm font-bold">{{ $t('Sitemap and robots.txt') }}</h3>
        <label class="mt-3 flex items-center gap-2 text-sm">
          <input v-model="settings.seo.collectionPages" type="checkbox" class="h-4 w-4 rounded" />
          {{ $t('List collection pages (e.g. /en/projects) in the sitemap') }}
        </label>
        <label class="field-label mt-4" for="seo-robots">{{ $t('Extra robots.txt lines') }}</label>
        <textarea
          id="seo-robots"
          v-model="settings.seo.robotsExtra"
          rows="3"
          class="input font-mono text-xs"
          dir="ltr"
          placeholder="Disallow: /drafts"
        />
        <p class="mt-2 text-xs text-slate-500">
          <a :href="`${settings.origin}/sitemap.xml`" target="_blank" class="underline">{{ settings.origin }}/sitemap.xml</a>
          ·
          <a :href="`${settings.origin}/robots.txt`" target="_blank" class="underline">robots.txt</a>
        </p>
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <div class="flex items-center justify-between">
          <h2 class="font-black">{{ $t('Menu and header') }}</h2>
          <button type="button" class="btn-light" @click="addMenuItem"><i class="mdi mdi-plus" /> {{ $t('Add link') }}</button>
        </div>
        <p class="mt-1 text-xs text-slate-400">{{ $t('Use a page address (e.g. about-us), an anchor (#services) or a full URL.') }}</p>
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
            <LinkInput v-model="item.href" class="w-56 flex-1" placeholder="#services" />
            <button
              type="button"
              class="btn-icon"
              :disabled="i === 0"
              @click="settings.menu.splice(i - 1, 0, ...settings.menu.splice(i, 1))"
            >
              <i class="mdi mdi-arrow-up" />
            </button>
            <button type="button" class="btn-icon hover:!text-red-600" @click="settings.menu.splice(i, 1)">
              <i class="mdi mdi-close" />
            </button>
          </div>
        </div>
        <div class="mt-6 border-t border-slate-100 pt-5">
          <h3 class="text-sm font-bold">{{ $t('Header button') }}</h3>
          <p class="mt-1 text-xs text-slate-400">
            {{
              $t(
                'A button beside the menu, such as “Get in touch”; none when the text is empty. The header’s look is chosen in Site theme → Header.',
              )
            }}
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <input
              v-for="l in locales"
              :key="l.code"
              v-model="settings.header.ctaLabel[l.code]"
              class="input w-36 flex-1"
              :dir="l.dir"
              :placeholder="l.label"
            />
            <LinkInput v-model="settings.header.ctaLink" class="w-56 flex-1" placeholder="#contact" />
          </div>
          <label class="mt-4 flex items-center gap-2 text-sm">
            <input v-model="settings.header.overlay" type="checkbox" class="h-4 w-4 rounded" />
            {{ $t('Float the header over the first block of every page, with white text') }}
          </label>
          <p class="mt-1 text-xs text-slate-400">{{ $t('It always floats over the spotlight and big type heroes.') }}</p>
        </div>
        <div class="mt-6 border-t border-slate-100 pt-5">
          <h3 class="text-sm font-bold">{{ $t('City and local time') }}</h3>
          <p class="mt-1 text-xs text-slate-400">
            {{
              $t(
                'Shown in the middle of the “Bar with the local time” header. The time zone is a name such as Europe/London or Asia/Tehran.',
              )
            }}
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <input
              v-for="l in locales"
              :key="l.code"
              v-model="settings.header.place[l.code]"
              class="input w-36 flex-1"
              :dir="l.dir"
              :placeholder="l.label"
            />
            <input v-model="settings.header.timeZone" class="input w-56 flex-1" dir="ltr" placeholder="Europe/London" />
          </div>
        </div>
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">{{ $t('Form messages') }}</h2>
        <p class="mt-1 text-xs text-slate-400">
          {{ $t('Every message is kept in the Inbox. To also receive it by email, enter an address; the server needs SMTP_URL set.') }}
        </p>
        <label class="field-label mt-4" for="notify">{{ $t('Email new messages to') }}</label>
        <input id="notify" v-model="settings.notifyEmail" type="email" class="input max-w-sm" dir="ltr" placeholder="you@example.com" />
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">{{ $t('Fonts') }}</h2>
        <p class="mt-1 text-xs text-slate-400">
          {{ $t("Your own fonts, e.g. a logo typeface. After uploading, pick them in a theme's font lists.") }}
        </p>
        <div class="mt-4">
          <FontManager v-model="settings.fonts" />
        </div>
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">{{ $t('Page loader') }}</h2>
        <p class="mt-1 text-xs text-slate-400">
          {{ $t('A screen shown while the site opens, counting up to 100% and then revealing the site name.') }}
        </p>
        <label class="mt-4 flex items-center gap-2 text-sm">
          <input v-model="settings.loader.enabled" type="checkbox" class="h-4 w-4 rounded" /> {{ $t('Show a loading screen') }}
        </label>
        <div v-if="settings.loader.enabled" class="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label class="field-label" for="loader-style">{{ $t('Style') }}</label>
            <select id="loader-style" v-model="settings.loader.style" class="input">
              <option v-for="s in loaderStyleOptions" :key="s.value" :value="s.value">{{ $t(s.label) }}</option>
            </select>
          </div>
          <label class="flex items-center gap-2 self-end pb-2 text-sm">
            <input v-model="settings.loader.oncePerSession" type="checkbox" class="h-4 w-4 rounded" />
            {{ $t('Only on the first page of a visit') }}
          </label>
          <div v-for="l in locales" :key="l.code">
            <label class="field-label">{{ $t('Line under the counter ({lang})', { lang: l.label }) }}</label>
            <input v-model="settings.loader.text[l.code]" class="input" :dir="l.dir" maxlength="120" />
          </div>
          <FieldInput
            v-model="settings.loader.background"
            :field="imageField('loaderBg', $t('Background picture (blurred, sharpening as it loads)'))"
          />
        </div>
        <div v-if="settings.loader.enabled" class="mt-4">
          <button type="button" class="btn-light" @click="loaderPreview++"><i class="mdi mdi-play" /> {{ $t('Preview') }}</button>
          <div v-if="loaderPreview" class="relative mt-3 h-64 overflow-hidden rounded-2xl bg-slate-100">
            <SiteLoader
              :key="loaderPreview"
              :loader="settings.loader"
              :site-name="settings.siteName.en || 'Your site'"
              :logo="settings.logo"
              locale="en"
              preview
            />
            <p class="flex h-full items-center justify-center text-xs text-slate-400">{{ $t('The site appears here.') }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">{{ $t('Custom CSS') }}</h2>
        <p class="mt-1 text-xs text-slate-400">
          {{
            $t(
              'Your own styles for every page of the site, added after the theme. Each page can also have its own CSS in the page editor (Design).',
            )
          }}
        </p>
        <textarea
          v-model="settings.customCss"
          rows="10"
          class="input mt-4 font-mono text-xs leading-relaxed"
          dir="ltr"
          spellcheck="false"
          :placeholder="cssPlaceholder"
          data-testid="site-css"
        />
        <p class="mt-1 text-[11px] text-slate-400">
          {{
            $t(
              'Tip: every block has the class .pf-block and one for its kind (e.g. .pf-spotlight), or use the anchor set in its settings (#services). The page is inside .site and the menu is header.',
            )
          }}
        </p>
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">{{ $t('Maintenance mode') }}</h2>
        <label class="mt-4 flex items-center gap-2 text-sm">
          <input v-model="settings.maintenance" type="checkbox" class="h-4 w-4 rounded" /> {{ $t('Show a “back soon” page to visitors') }}
        </label>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div v-for="l in locales" :key="l.code">
            <label class="field-label">{{ $t('Message ({lang})', { lang: l.label }) }}</label>
            <textarea v-model="settings.maintenanceText[l.code]" rows="2" class="input" :dir="l.dir" />
          </div>
        </div>
      </section>

      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">{{ $t('Custom blocks (AI)') }}</h2>
        <p class="mt-1 text-xs text-slate-400">
          {{ $t('Each admin connects their own AI models (provider, model and API key) in the block builder, for this site.') }}
        </p>
        <NuxtLink to="/admin/blocks" class="btn-light mt-4 inline-flex"
          ><i class="mdi mdi-creation" /> {{ $t('Open the block builder') }}</NuxtLink
        >
      </section>

      <SiteTemplates @applied="load" />
    </div>

    <!-- Theme -->
    <aside class="space-y-6">
      <section class="rounded-[2rem] bg-white p-7 shadow-sm">
        <h2 class="font-black">{{ $t('Site theme') }}</h2>
        <p class="mt-1 text-xs text-slate-400">
          {{ $t("Used by every page, unless a page has its own theme (set in the page editor's Design panel).") }}
        </p>
        <div class="mt-5">
          <ThemeEditor
            v-model="settings.theme as ThemeTokens"
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
        <div
          class="p-6 text-center"
          :style="{ background: settings.theme.surface, borderRadius: settings.theme.radius, color: settings.theme.text }"
        >
          <p class="text-xl font-black">{{ settings.siteName.en || $t('Your site') }}</p>
          <p class="mt-1 text-xs font-light" :style="{ color: settings.theme.muted }">{{ $t('Panel preview') }}</p>
          <div class="mt-4 flex justify-center gap-2">
            <span
              class="px-4 py-1.5 text-xs text-white"
              :style="{ background: settings.theme.primary, borderRadius: settings.theme.buttonRadius }"
              >{{ $t('Primary') }}</span
            >
            <span
              class="px-4 py-1.5 text-xs text-white"
              :style="{ background: settings.theme.secondary, borderRadius: settings.theme.buttonRadius }"
              >{{ $t('Secondary') }}</span
            >
          </div>
        </div>
        <div
          class="mt-3 p-4 text-center text-xs text-white"
          :style="{ background: settings.theme.dark, borderRadius: settings.theme.radius }"
        >
          {{ $t('Dark section') }}
        </div>
      </section>
    </aside>
  </div>
</template>
