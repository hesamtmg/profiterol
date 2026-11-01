<script setup lang="ts">
/**
 * Admin → Sites → Preview sites: trials the owner makes for people thinking of buying a site. Each lives at
 * <PREVIEW_URL>/preview/<name>, starts from a template with its pages published, invites the person as its admin,
 * and goes offline when its days are up. Bought ones are converted to a real site on the customer's own address.
 */
import { locales } from '@profiterol/blocks';

export interface PreviewRow {
  id: string;
  name: string;
  url: string;
  previewSlug: string | null;
  expiresAt: string | null;
  expired: boolean;
  prospect: string;
  createdAt: string;
}

const props = defineProps<{
  previews: PreviewRow[];
  /** PREVIEW_URL, e.g. https://profiterol.ir; '' when previews are off. */
  previewUrl: string;
  graceDays: number;
  serverIp?: string;
}>();
const emit = defineEmits<{ changed: [] }>();

const api = useApi();
const { numberLocale, lang } = useAdminI18n();
const busy = ref(false);
const error = ref('');
const showAdd = ref(false);
const templates = ref<{ key: string; name: Record<string, string>; description: Record<string, string> }[]>([]);
const form = reactive({
  name: '',
  slug: '',
  slugTouched: false,
  template: 'demo',
  days: 14,
  prospect: '',
  adminEmail: '',
  adminLang: lang.value as '' | 'en' | 'fa',
  defaultLocale: '',
});
const created = ref<{ site: PreviewRow; invite: { email: string; link: string; emailed: boolean } | null } | null>(null);
const converting = reactive<Record<string, { domain: string; www: boolean; ssl: boolean } | undefined>>({});
const notes = reactive<Record<string, string | undefined>>({});

/** ali-shop from "Ali's Shop" (Persian names give nothing, so the owner types one). */
const toSlug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
watch(
  () => form.name,
  (name) => {
    if (!form.slugTouched) form.slug = toSlug(name);
  },
);
const slug = computed(() => toSlug(form.slug));
const previewHost = computed(() => props.previewUrl.replace(/^https?:\/\//, ''));

/** On a development machine the admin runs on a port, and so does every site. */
function here(url: string) {
  if (!import.meta.client || !location.port) return url;
  const u = new URL(url);
  u.protocol = location.protocol;
  u.port = location.port;
  return u.href.replace(/\/$/, '');
}

async function run(fn: () => Promise<void>) {
  busy.value = true;
  error.value = '';
  try {
    await fn();
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    busy.value = false;
  }
}

const create = () =>
  run(async () => {
    created.value = await api<NonNullable<typeof created.value>>('/admin/sites/previews', {
      method: 'POST',
      body: {
        name: form.name.trim() || slug.value,
        slug: slug.value,
        template: form.template,
        days: form.days,
        prospect: form.prospect,
        adminLang: form.adminLang,
        defaultLocale: form.defaultLocale,
        ...(form.adminEmail ? { adminEmail: form.adminEmail } : {}),
      },
    });
    Object.assign(form, { name: '', slug: '', slugTouched: false, prospect: '', adminEmail: '' });
    showAdd.value = false;
    emit('changed');
  });

const extend = (p: PreviewRow, days: number) =>
  run(async () => {
    await api(`/admin/sites/${p.id}/preview`, { method: 'PATCH', body: { extendDays: days } });
    emit('changed');
  });

const saveNotes = (p: PreviewRow) =>
  run(async () => {
    await api(`/admin/sites/${p.id}/preview`, { method: 'PATCH', body: { prospect: notes[p.id] ?? '' } });
    notes[p.id] = undefined;
    emit('changed');
  });

const openAdmin = (p: PreviewRow) =>
  run(async () => {
    const { url } = await api<{ url: string }>(`/admin/sites/${p.id}/open`, { method: 'POST' });
    window.open(here(url), '_blank', 'noopener');
  });

const copied = ref('');
async function copy(p: PreviewRow) {
  await navigator.clipboard?.writeText(here(p.url)).catch(() => undefined);
  copied.value = p.id;
  setTimeout(() => (copied.value = ''), 1500);
}

const cleanDomain = (d: string) =>
  d
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');

const convert = (p: PreviewRow) =>
  run(async () => {
    const c = converting[p.id]!;
    const domain = cleanDomain(c.domain);
    await api(`/admin/sites/${p.id}/convert`, {
      method: 'POST',
      body: { domain, aliases: c.www && !domain.startsWith('www.') ? [`www.${domain}`] : [], ssl: c.ssl },
    });
    converting[p.id] = undefined;
    emit('changed');
  });

const remove = (p: PreviewRow) =>
  run(async () => {
    const typed = prompt(
      translate('This deletes the preview {name} and everything in it. Type {name} to confirm.', { name: p.previewSlug ?? '' }),
    );
    if (typed === null) return;
    await api(`/admin/sites/${p.id}`, { method: 'DELETE', body: { confirm: typed } });
    emit('changed');
  });

const date = (d: string | null) => (d ? new Date(d).toLocaleDateString(numberLocale.value) : '—');
const daysLeft = (d: string | null) => (d ? Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)) : 0);
/** When an ended preview is deleted for good. */
const deletedOn = (p: PreviewRow) =>
  p.expiresAt ? date(new Date(new Date(p.expiresAt).getTime() + props.graceDays * 86_400_000).toISOString()) : '—';

onMounted(async () => {
  templates.value = await api<typeof templates.value>('/admin/site-templates').catch(() => []);
});
</script>

<template>
  <section class="mt-10" data-testid="preview-sites">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-black">{{ $t('Preview sites') }}</h2>
        <p class="mt-1 max-w-2xl text-sm font-light text-slate-500">
          {{
            $t(
              'A ready site to show someone before they buy: they get its admin, can change everything, and it goes offline when its days are up.',
            )
          }}
        </p>
      </div>
      <button v-if="previewUrl" type="button" class="btn-dark" data-testid="new-preview" @click="showAdd = !showAdd">
        <i class="mdi mdi-eye-plus-outline" /> {{ $t('New preview site') }}
      </button>
    </div>

    <p v-if="!previewUrl" class="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
      <i class="mdi mdi-information-outline" />
      {{ $t('Preview sites are off. Set PREVIEW_URL (for example https://profiterol.ir) in the server’s .env; see DEPLOY.md.') }}
    </p>

    <form v-if="showAdd" class="mt-6 rounded-[2rem] bg-white p-7 shadow-sm" data-testid="add-preview" @submit.prevent="create">
      <h3 class="font-black">{{ $t('New preview site') }}</h3>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label class="field-label" for="preview-name">{{ $t('Name') }}</label>
          <input id="preview-name" v-model="form.name" class="input" :placeholder="$t('Ali’s shop')" required />
        </div>
        <div>
          <label class="field-label" for="preview-slug">{{ $t('Address') }}</label>
          <div class="flex items-center gap-1" dir="ltr">
            <span class="shrink-0 text-xs text-slate-500">{{ previewHost }}/preview/</span>
            <input
              id="preview-slug"
              v-model="form.slug"
              class="input"
              dir="ltr"
              placeholder="ali-shop"
              pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]"
              required
              @input="form.slugTouched = true"
            />
          </div>
          <p class="mt-1 text-xs text-slate-500">{{ $t('Lowercase English letters, digits and dashes.') }}</p>
        </div>
        <div class="md:col-span-2">
          <span class="field-label">{{ $t('Start from') }}</span>
          <div class="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label
              v-for="t in [
                { key: 'demo', name: { en: 'Demo content', fa: 'محتوای نمونه' } },
                ...templates,
                { key: 'blank', name: { en: 'Empty site', fa: 'سایت خالی' } },
              ]"
              :key="t.key"
              class="flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 text-sm ring-1"
              :class="form.template === t.key ? 'bg-slate-900 text-white ring-slate-900' : 'ring-slate-200 hover:bg-slate-50'"
            >
              <input v-model="form.template" type="radio" :value="t.key" class="sr-only" />
              {{ t.name[lang] || t.name.en }}
            </label>
          </div>
        </div>
        <div>
          <label class="field-label" for="preview-days">{{ $t('Online for (days)') }}</label>
          <input id="preview-days" v-model.number="form.days" type="number" min="1" max="365" class="input" required />
        </div>
        <div>
          <label class="field-label" for="preview-admin">{{ $t('Their email (invited as the preview’s admin)') }}</label>
          <input id="preview-admin" v-model="form.adminEmail" type="email" class="input" dir="ltr" placeholder="ali@example.com" />
        </div>
        <div>
          <label class="field-label" for="preview-admin-lang">{{ $t('Admin panel language') }}</label>
          <select id="preview-admin-lang" v-model="form.adminLang" class="input">
            <option value="en">English</option>
            <option value="fa">فارسی</option>
            <option value="">{{ $t('Each person’s browser language') }}</option>
          </select>
        </div>
        <div>
          <label class="field-label" for="preview-locale">{{ $t('Site language') }}</label>
          <select id="preview-locale" v-model="form.defaultLocale" class="input">
            <option v-for="l in locales" :key="l.code" :value="l.code">{{ l.label }}</option>
            <option value="">{{ $t('Each visitor’s browser language') }}</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="field-label" for="preview-notes">{{ $t('Notes (only you see them)') }}</label>
          <textarea
            id="preview-notes"
            v-model="form.prospect"
            class="input"
            rows="2"
            :placeholder="$t('Who it is for, phone, what they want…')"
          />
        </div>
      </div>
      <div class="mt-6 flex gap-2">
        <button type="submit" class="btn-dark" :disabled="busy || slug.length < 3">{{ $t('Create preview') }}</button>
        <button type="button" class="btn-light" @click="showAdd = false">{{ $t('Cancel') }}</button>
      </div>
    </form>

    <div v-if="created" class="mt-6 rounded-[2rem] bg-emerald-50 p-6 text-sm text-emerald-900 ring-1 ring-emerald-200" role="status">
      <p class="font-semibold">{{ $t('The preview is ready:') }}</p>
      <input
        :value="here(created.site.url)"
        readonly
        class="input mt-2 text-xs"
        dir="ltr"
        @focus="($event.target as HTMLInputElement).select()"
      />
      <template v-if="created.invite">
        <p class="mt-3">
          {{
            created.invite.emailed
              ? $t('{email} was emailed this link to choose a password:', { email: created.invite.email })
              : $t('Send {email} this link to choose a password:', { email: created.invite.email })
          }}
        </p>
        <input
          :value="here(created.invite.link)"
          readonly
          class="input mt-2 text-xs"
          dir="ltr"
          data-testid="preview-invite"
          @focus="($event.target as HTMLInputElement).select()"
        />
      </template>
      <button type="button" class="btn-light mt-3" @click="created = null">{{ $t('Close') }}</button>
    </div>

    <p v-if="error" class="mt-6 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>

    <div v-if="previews.length" class="mt-6 grid gap-4 lg:grid-cols-2">
      <article v-for="p in previews" :key="p.id" class="rounded-[2rem] bg-white p-6 shadow-sm" :data-preview="p.previewSlug">
        <div class="flex flex-wrap items-start gap-3">
          <div class="min-w-0 flex-1">
            <h3 class="flex flex-wrap items-center gap-2 text-lg font-black">
              {{ p.name }}
              <span v-if="p.expired" class="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">{{
                $t('ended')
              }}</span>
              <span v-else class="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                {{ $t('{n} days left', { n: daysLeft(p.expiresAt).toLocaleString(numberLocale) }) }}
              </span>
            </h3>
            <a
              :href="here(p.url)"
              target="_blank"
              rel="noopener"
              class="mt-1 block truncate text-sm text-[#00796d] hover:underline"
              dir="ltr"
            >
              {{ here(p.url) }}
            </a>
            <p class="mt-1 text-xs text-slate-500">
              {{ $t('Until {date}', { date: date(p.expiresAt) }) }}
              <template v-if="p.expired"> · {{ $t('deleted on {date} unless extended', { date: deletedOn(p) }) }}</template>
            </p>
          </div>
          <div class="flex flex-wrap gap-1">
            <button type="button" class="btn-light !px-3" :title="$t('Copy link')" @click="copy(p)">
              <i class="mdi" :class="copied === p.id ? 'mdi-check' : 'mdi-content-copy'" />
            </button>
            <button type="button" class="btn-light" :disabled="busy" @click="openAdmin(p)">
              <i class="mdi mdi-open-in-new" /> {{ $t('Open admin') }}
            </button>
          </div>
        </div>

        <p
          v-if="p.prospect && notes[p.id] === undefined"
          class="mt-3 whitespace-pre-line rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600"
        >
          {{ p.prospect }}
        </p>
        <div v-if="notes[p.id] !== undefined" class="mt-3">
          <textarea v-model="notes[p.id]" class="input" rows="2" />
          <div class="mt-2 flex gap-2">
            <button type="button" class="btn-dark" :disabled="busy" @click="saveNotes(p)">{{ $t('Save') }}</button>
            <button type="button" class="btn-light" @click="notes[p.id] = undefined">{{ $t('Cancel') }}</button>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2 text-sm">
          <button type="button" class="btn-light" :disabled="busy" data-testid="extend-7" @click="extend(p, 7)">+7 {{ $t('days') }}</button>
          <button type="button" class="btn-light" :disabled="busy" @click="extend(p, 14)">+14 {{ $t('days') }}</button>
          <button type="button" class="btn-light" @click="notes[p.id] = p.prospect">
            <i class="mdi mdi-note-edit-outline" /> {{ $t('Notes') }}
          </button>
          <button
            type="button"
            class="btn-light text-emerald-700"
            data-testid="convert-preview"
            @click="converting[p.id] = converting[p.id] ? undefined : { domain: '', www: true, ssl: true }"
          >
            <i class="mdi mdi-check-decagram-outline" /> {{ $t('They bought it') }}
          </button>
          <button type="button" class="btn-light ms-auto text-red-600" :disabled="busy" @click="remove(p)">
            <i class="mdi mdi-delete-outline" /> {{ $t('Delete') }}
          </button>
        </div>

        <form v-if="converting[p.id]" class="mt-4 rounded-2xl bg-slate-50 p-4" @submit.prevent="convert(p)">
          <p class="text-sm font-semibold">{{ $t('Make it a real site on their own address') }}</p>
          <p class="mt-1 text-xs text-slate-500">
            {{ $t('Pages, settings and accounts are kept. The preview link will send visitors to the new address.') }}
          </p>
          <label class="field-label mt-3" :for="`convert-${p.id}`">{{ $t('Address') }}</label>
          <input :id="`convert-${p.id}`" v-model="converting[p.id]!.domain" class="input" dir="ltr" placeholder="alishop.com" required />
          <label class="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <input v-model="converting[p.id]!.www" type="checkbox" class="h-4 w-4 rounded" />
            {{ $t('Also www.{domain} (redirects to it)', { domain: cleanDomain(converting[p.id]!.domain) || 'alishop.com' }) }}
          </label>
          <label class="mt-1 flex items-center gap-2 text-xs text-slate-600">
            <input v-model="converting[p.id]!.ssl" type="checkbox" class="h-4 w-4 rounded" /> {{ $t('Issue an SSL certificate now') }}
          </label>
          <p class="mt-2 text-xs text-slate-500">
            {{
              $t('At your domain registrar, point an A record for {domain} to this server', {
                domain: cleanDomain(converting[p.id]!.domain) || 'alishop.com',
              })
            }}<template v-if="serverIp">
              <code class="rounded bg-white px-1.5 py-0.5 font-mono" dir="ltr">{{ serverIp }}</code></template
            >.
          </p>
          <button type="submit" class="btn-dark mt-3" :disabled="busy || !cleanDomain(converting[p.id]!.domain)">
            {{ $t('Convert to a real site') }}
          </button>
        </form>
      </article>
    </div>
    <p v-else-if="previewUrl" class="mt-4 text-sm text-slate-500">{{ $t('No preview sites yet.') }}</p>
  </section>
</template>
