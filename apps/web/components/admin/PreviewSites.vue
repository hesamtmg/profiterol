<script setup lang="ts">
/**
 * Preview sites: ready sites to show someone before they buy one. Each starts from a template with its pages
 * published, can be sent to anyone as an admin panel, and goes offline when its days are up.
 *
 * - mode "owner" (Admin → Sites): every preview of every site; the owners' own live at <PREVIEW_URL>/preview/<name>.
 *   Owners set no limits on themselves, sign in to any preview, and turn bought ones into real sites.
 * - mode "site" (Admin → Preview sites): a site the owner allows it on. Its admins make previews under the site's
 *   own address, within the owner's limits, see only theirs, and ask the owners to move a bought one.
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
  /** The address its maker asked the owners to move it to. */
  convertRequest?: string | null;
  /** Owner view: the site whose admins made it (null: an owner's own). */
  previewHostId?: string | null;
  previewHostName?: string | null;
}

const props = defineProps<{
  mode: 'owner' | 'site';
  previews: PreviewRow[];
  /** Where new previews are made: PREVIEW_URL for the owners ('' when it is not set), the site's address for a site. */
  base: string;
  graceDays: number;
  serverIp?: string;
  /** Site mode: the owner's limits and how many previews are online now. */
  limits?: { max: number; maxDays: number; live: number } | null;
}>();
const emit = defineEmits<{ changed: [] }>();

const DAY = 86_400_000;
const owner = computed(() => props.mode === 'owner');
const api = useApi();
const { numberLocale, lang } = useAdminI18n();
const busy = ref(false);
const error = ref('');
const showAdd = ref(false);
const templates = ref<{ key: string; name: Record<string, string>; description: Record<string, string> }[]>([]);
const maxDays = computed(() => props.limits?.maxDays ?? 365);
const full = computed(() => !!props.limits && props.limits.live >= props.limits.max);
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
watch(
  maxDays,
  (max) => {
    if (form.days > max) form.days = max;
  },
  { immediate: true },
);
type Invite = { email: string; link: string; emailed: boolean };
const created = ref<{ site: PreviewRow; invite: Invite | null } | null>(null);
const converting = reactive<Record<string, { domain: string; www: boolean; ssl: boolean } | undefined>>({});
const asking = reactive<Record<string, string | undefined>>({});
const notes = reactive<Record<string, string | undefined>>({});
const inviting = reactive<Record<string, string | undefined>>({});
const invited = reactive<Record<string, Invite | undefined>>({});

/** Where each request goes: the owners' Admin → Sites routes, or the site's own. */
const paths = {
  create: () => (owner.value ? '/admin/sites/previews' : '/admin/previews'),
  update: (p: PreviewRow) => (owner.value ? `/admin/sites/${p.id}/preview` : `/admin/previews/${p.id}`),
  invite: (p: PreviewRow) => (owner.value ? `/admin/sites/${p.id}/invite` : `/admin/previews/${p.id}/invite`),
  remove: (p: PreviewRow) => (owner.value ? `/admin/sites/${p.id}` : `/admin/previews/${p.id}`),
};

/** ali-shop from "Ali's Shop" (Persian names give nothing, so one is typed). */
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
const baseHost = computed(() => props.base.replace(/^https?:\/\//, ''));

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
    created.value = await api<NonNullable<typeof created.value>>(paths.create(), {
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

/** Within a site's limit, a preview stays online at most maxDays from when it was made. */
function canExtend(p: PreviewRow, days: number) {
  if (!props.limits) return true;
  const from = Math.max(Date.now(), p.expiresAt ? new Date(p.expiresAt).getTime() : Date.now());
  return from + days * DAY <= new Date(p.createdAt).getTime() + props.limits.maxDays * DAY + 60_000;
}

const extend = (p: PreviewRow, days: number) =>
  run(async () => {
    await api(paths.update(p), { method: 'PATCH', body: { extendDays: days } });
    emit('changed');
  });

const saveNotes = (p: PreviewRow) =>
  run(async () => {
    await api(paths.update(p), { method: 'PATCH', body: { prospect: notes[p.id] ?? '' } });
    notes[p.id] = undefined;
    emit('changed');
  });

/** Owners: sign in to the preview's admin with a one-time link. */
const openAdmin = (p: PreviewRow) =>
  run(async () => {
    const { url } = await api<{ url: string }>(`/admin/sites/${p.id}/open`, { method: 'POST' });
    window.open(here(url), '_blank', 'noopener');
  });

/** Gives someone the preview's admin panel: an account there and a link to choose its password. */
const sendAccess = (p: PreviewRow) =>
  run(async () => {
    invited[p.id] = await api<Invite>(paths.invite(p), { method: 'POST', body: { email: inviting[p.id] ?? '' } });
    inviting[p.id] = undefined;
  });

const copied = ref('');
async function copy(text: string, key: string) {
  await navigator.clipboard?.writeText(here(text)).catch(() => undefined);
  copied.value = key;
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

/** Owners: the preview becomes a real site on its own address. */
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

/** A site's admins: ask the owners to move it to the customer's address ('' withdraws the request). */
const askToConvert = (p: PreviewRow, domain: string) =>
  run(async () => {
    await api(`/admin/previews/${p.id}/convert-request`, { method: 'POST', body: { domain: cleanDomain(domain) } });
    asking[p.id] = undefined;
    emit('changed');
  });

function toggleBought(p: PreviewRow) {
  if (owner.value) converting[p.id] = converting[p.id] ? undefined : { domain: p.convertRequest ?? '', www: true, ssl: true };
  else asking[p.id] = asking[p.id] === undefined ? (p.convertRequest ?? '') : undefined;
}

const remove = (p: PreviewRow) =>
  run(async () => {
    const typed = prompt(
      translate('This deletes the preview {name} and everything in it. Type {name} to confirm.', { name: p.previewSlug ?? '' }),
    );
    if (typed === null) return;
    await api(paths.remove(p), { method: 'DELETE', body: { confirm: typed } });
    emit('changed');
  });

const date = (d: string | null) => (d ? new Date(d).toLocaleDateString(numberLocale.value) : '—');
const daysLeft = (d: string | null) => (d ? Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / DAY)) : 0);
/** When an ended preview is deleted for good. */
const deletedOn = (p: PreviewRow) =>
  p.expiresAt ? date(new Date(new Date(p.expiresAt).getTime() + props.graceDays * DAY).toISOString()) : '—';
const num = (n: number) => n.toLocaleString(numberLocale.value);

onMounted(async () => {
  templates.value = await api<typeof templates.value>('/admin/site-templates').catch(() => []);
});
</script>

<template>
  <section :class="owner ? 'mt-10' : ''" data-testid="preview-sites">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <component :is="owner ? 'h2' : 'h1'" :class="owner ? 'text-2xl font-black' : 'text-3xl font-black'">{{
          $t('Preview sites')
        }}</component>
        <p class="mt-1 max-w-2xl text-sm font-light text-slate-500">
          {{
            $t(
              'A ready site to show someone before they buy: they get its admin, can change everything, and it goes offline when its days are up.',
            )
          }}
        </p>
        <p v-if="limits" class="mt-2 text-xs text-slate-500" data-testid="preview-limits">
          <i class="mdi mdi-gauge" />
          {{
            $t('{live} of {max} online · each for up to {days} days', {
              live: num(limits.live),
              max: num(limits.max),
              days: num(limits.maxDays),
            })
          }}
        </p>
      </div>
      <button v-if="base" type="button" class="btn-dark" data-testid="new-preview" :disabled="full" @click="showAdd = !showAdd">
        <i class="mdi mdi-eye-plus-outline" /> {{ $t('New preview site') }}
      </button>
    </div>

    <p v-if="full" class="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
      {{ $t('You have as many previews online as your plan allows. Delete one, or wait for one to end.') }}
    </p>
    <p v-if="owner && !base" class="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
      <i class="mdi mdi-information-outline" />
      {{ $t('Your own previews are off. Set PREVIEW_URL (for example https://profiterol.ir) in the server’s .env; see DEPLOY.md.') }}
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
            <span class="shrink-0 text-xs text-slate-500">{{ baseHost }}/preview/</span>
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
          <input id="preview-days" v-model.number="form.days" type="number" min="1" :max="maxDays" class="input" required />
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
                {{ $t('{n} days left', { n: num(daysLeft(p.expiresAt)) }) }}
              </span>
              <span
                v-if="owner && p.previewHostName"
                class="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800"
                data-testid="preview-host"
              >
                {{ $t('by {site}', { site: p.previewHostName }) }}
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
            <button type="button" class="btn-light !px-3" :title="$t('Copy link')" @click="copy(p.url, p.id)">
              <i class="mdi" :class="copied === p.id ? 'mdi-check' : 'mdi-content-copy'" />
            </button>
            <button v-if="owner" type="button" class="btn-light" :disabled="busy" @click="openAdmin(p)">
              <i class="mdi mdi-open-in-new" /> {{ $t('Open admin') }}
            </button>
          </div>
        </div>

        <p
          v-if="p.convertRequest"
          class="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200"
          data-testid="convert-request"
        >
          <i class="mdi mdi-check-decagram-outline" />
          {{
            owner
              ? $t('Bought: asked to move it to {domain}', { domain: p.convertRequest })
              : $t('You asked us to move it to {domain}. We will let you know when it is live there.', { domain: p.convertRequest })
          }}
        </p>

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
          <button
            v-for="d in [7, 14]"
            :key="d"
            type="button"
            class="btn-light"
            :disabled="busy || !canExtend(p, d)"
            :data-testid="`extend-${d}`"
            @click="extend(p, d)"
          >
            +{{ num(d) }} {{ $t('days') }}
          </button>
          <button
            type="button"
            class="btn-light"
            data-testid="send-access"
            @click="inviting[p.id] = inviting[p.id] === undefined ? '' : undefined"
          >
            <i class="mdi mdi-account-key-outline" /> {{ $t('Send admin access') }}
          </button>
          <button type="button" class="btn-light" @click="notes[p.id] = p.prospect">
            <i class="mdi mdi-note-edit-outline" /> {{ $t('Notes') }}
          </button>
          <button type="button" class="btn-light text-emerald-700" data-testid="convert-preview" @click="toggleBought(p)">
            <i class="mdi mdi-check-decagram-outline" /> {{ $t('They bought it') }}
          </button>
          <button type="button" class="btn-light ms-auto text-red-600" :disabled="busy" @click="remove(p)">
            <i class="mdi mdi-delete-outline" /> {{ $t('Delete') }}
          </button>
        </div>

        <!-- Anyone can be given the preview's admin panel. -->
        <form v-if="inviting[p.id] !== undefined" class="mt-4 rounded-2xl bg-slate-50 p-4" @submit.prevent="sendAccess(p)">
          <p class="text-sm font-semibold">{{ $t('Send someone this preview’s admin panel') }}</p>
          <p class="mt-1 text-xs text-slate-500">
            {{ $t('They get an admin account on the preview only, and a link to choose its password (valid 7 days).') }}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <input
              v-model="inviting[p.id]"
              type="email"
              class="input max-w-xs"
              dir="ltr"
              required
              placeholder="ali@example.com"
              data-testid="access-email"
            />
            <button type="submit" class="btn-dark" :disabled="busy">{{ $t('Send') }}</button>
          </div>
        </form>
        <div v-if="invited[p.id]" class="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200" role="status">
          {{
            invited[p.id]!.emailed
              ? $t('{email} was emailed this link to choose a password:', { email: invited[p.id]!.email })
              : $t('Send {email} this link to choose a password:', { email: invited[p.id]!.email })
          }}
          <div class="mt-2 flex gap-2">
            <input :value="here(invited[p.id]!.link)" readonly class="input text-xs" dir="ltr" data-testid="access-link" />
            <button type="button" class="btn-light !px-3" :title="$t('Copy link')" @click="copy(invited[p.id]!.link, `invite-${p.id}`)">
              <i class="mdi" :class="copied === `invite-${p.id}` ? 'mdi-check' : 'mdi-content-copy'" />
            </button>
            <button type="button" class="btn-light" @click="invited[p.id] = undefined">{{ $t('Close') }}</button>
          </div>
        </div>

        <!-- A site's admins: ask the owners to move it. -->
        <form
          v-if="!owner && asking[p.id] !== undefined"
          class="mt-4 rounded-2xl bg-slate-50 p-4"
          @submit.prevent="askToConvert(p, asking[p.id] ?? '')"
        >
          <p class="text-sm font-semibold">{{ $t('Move it to the customer’s own address') }}</p>
          <p class="mt-1 text-xs text-slate-500">
            {{ $t('Tell us their domain; we set it up with its certificate. Pages, settings and accounts are kept.') }}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <input v-model="asking[p.id]" class="input max-w-xs" dir="ltr" placeholder="alishop.com" data-testid="convert-domain" />
            <button type="submit" class="btn-dark" :disabled="busy || !cleanDomain(asking[p.id] ?? '')">{{ $t('Send request') }}</button>
            <button v-if="p.convertRequest" type="button" class="btn-light" :disabled="busy" @click="askToConvert(p, '')">
              {{ $t('Withdraw request') }}
            </button>
          </div>
        </form>

        <!-- Owners: the preview becomes a real site. -->
        <form v-if="owner && converting[p.id]" class="mt-4 rounded-2xl bg-slate-50 p-4" @submit.prevent="convert(p)">
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
    <p v-else-if="base" class="mt-4 text-sm text-slate-500">{{ $t('No preview sites yet.') }}</p>
  </section>
</template>
