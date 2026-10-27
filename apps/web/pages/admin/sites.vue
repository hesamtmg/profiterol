<script setup lang="ts">
/**
 * The owner's control panel: every site in this installation, its addresses and its certificate. Adding a site
 * only needs its address; the certificate is asked for when the owner chooses, and its progress shows here.
 */
import { locales } from '@profiterol/blocks';

definePageMeta({ layout: 'admin', middleware: 'admin' });

type SslState = 'none' | 'queued' | 'running' | 'active' | 'failed';
/** The language a site's admin panel opens in, for people who have not picked one; '' follows their browser. */
type SiteAdminLang = '' | 'en' | 'fa';

interface SiteRow {
  id: string;
  name: string;
  primary: string;
  aliases: string[];
  url: string;
  adminLang: SiteAdminLang;
  /** The sublimation designer block and Print orders are allowed on this site. */
  printDesigner: boolean;
  sslMode: 'off' | 'requested';
  ssl: SslState;
  sslMessage: string;
  sslExpires: string | null;
  sslAttempts: number;
  sslRetryAt: string | null;
  createdAt: string;
  current: boolean;
}

interface SslEvent {
  id: string;
  step: string;
  state: 'running' | 'ok' | 'failed';
  message: string;
  createdAt: string;
}

interface SeoCheck {
  score: number;
  urls: number;
  sitemap: string;
  issues: { level: 'error' | 'warning'; message: string; where?: string }[];
}

interface Overview {
  sites: SiteRow[];
  agent: { lastSeen: string; serverIp: string; version: string; managedElsewhere: string[] } | null;
  owners: { id: string; email: string; name: string; lastLoginAt: string | null }[];
}

const api = useApi();
const { isOwner, user, fetchMe } = useAuth();
const { numberLocale, lang } = useAdminI18n();
const data = ref<Overview | null>(null);
const error = ref('');
const busy = ref(false);
const showAdd = ref(false);
// A new site's panel opens in the owner's own admin language unless they pick another.
const form = reactive({
  domain: '',
  www: true,
  name: '',
  adminEmail: '',
  ssl: true,
  demo: true,
  adminLang: lang.value as SiteAdminLang,
  defaultLocale: '',
  printDesigner: false,
});
const adminLangs: { code: SiteAdminLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fa', label: 'فارسی' },
  { code: '', label: 'Each person’s browser language' },
];
const adminLangLabel = (code: SiteAdminLang) => adminLangs.find((l) => l.code === code)?.label ?? code;
const added = ref<{ site: SiteRow; invite: { email: string; link: string; emailed: boolean } | null } | null>(null);
const events = reactive<Record<string, SslEvent[]>>({});
const openTimeline = reactive<Record<string, boolean>>({});
const seo = reactive<Record<string, SeoCheck | 'loading'>>({});
const editing = reactive<
  Record<string, { name: string; primary: string; aliases: string; adminLang: SiteAdminLang; printDesigner: boolean } | undefined>
>({});
const ownerInvite = reactive({ email: '', open: false, link: '' });

/** example.com from whatever was typed (https://Example.com/path → example.com). */
const cleanDomain = (d: string) =>
  d
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
const domain = computed(() => cleanDomain(form.domain));
const addAliases = computed(() => (form.www && domain.value && !domain.value.startsWith('www.') ? [`www.${domain.value}`] : []));
/**
 * A site's address as a link from here. On a development machine (the admin on a port, e.g. :8080) every site is
 * served on that same port and protocol; in production there is no port and the link is used as it is.
 */
function here(url: string) {
  if (!import.meta.client || !location.port) return url;
  const u = new URL(url);
  u.protocol = location.protocol;
  u.port = location.port;
  return u.href.replace(/\/$/, '');
}
const agentOnline = computed(() => !!data.value?.agent && Date.now() - new Date(data.value.agent.lastSeen).getTime() < 2 * 60_000);
const working = computed(() => data.value?.sites.some((s) => s.ssl === 'queued' || s.ssl === 'running') ?? false);

async function refresh() {
  try {
    data.value = await api<Overview>('/admin/sites');
    // Only the timelines still open on sites still here (one may just have been deleted).
    for (const site of data.value.sites) if (openTimeline[site.id]) await loadEvents(site.id);
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
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

const addSite = () =>
  run(async () => {
    const res = await api<NonNullable<typeof added.value>>('/admin/sites', {
      method: 'POST',
      body: {
        domain: domain.value,
        aliases: addAliases.value,
        name: form.name || domain.value,
        ssl: form.ssl,
        demo: form.demo,
        adminLang: form.adminLang,
        defaultLocale: form.defaultLocale,
        printDesigner: form.printDesigner,
        ...(form.adminEmail ? { adminEmail: form.adminEmail } : {}),
      },
    });
    added.value = res;
    Object.assign(form, { domain: '', name: '', adminEmail: '' });
    showAdd.value = false;
    openTimeline[res.site.id] = form.ssl;
    await refresh();
  });

async function loadEvents(id: string) {
  events[id] = await api<SslEvent[]>(`/admin/sites/${id}/ssl-events`);
}

async function toggleTimeline(id: string) {
  openTimeline[id] = !openTimeline[id];
  if (openTimeline[id]) await loadEvents(id).catch((err) => (error.value = apiErrorMessage(err)));
}

const requestSsl = (s: SiteRow) =>
  run(async () => {
    await api(`/admin/sites/${s.id}/ssl`, { method: 'POST' });
    openTimeline[s.id] = true;
    await refresh();
  });

const turnOffSsl = (s: SiteRow) =>
  run(async () => {
    if (!confirm(translate('Serve {domain} over plain HTTP? Visitors will see "not secure".', { domain: s.primary }))) return;
    await api(`/admin/sites/${s.id}/ssl`, { method: 'DELETE' });
    await refresh();
  });

/** Sessions are per address, so another site's admin opens through a one-time sign-in link. */
const openAdmin = (s: SiteRow) =>
  run(async () => {
    if (s.current) return void (await navigateTo('/admin'));
    const { url } = await api<{ url: string }>(`/admin/sites/${s.id}/open`, { method: 'POST' });
    window.open(here(url), '_blank', 'noopener');
  });

function startEdit(s: SiteRow) {
  editing[s.id] = {
    name: s.name,
    primary: s.primary,
    aliases: s.aliases.join('\n'),
    adminLang: s.adminLang,
    printDesigner: s.printDesigner,
  };
}

const saveEdit = (s: SiteRow) =>
  run(async () => {
    const e = editing[s.id]!;
    await api(`/admin/sites/${s.id}`, {
      method: 'PATCH',
      body: {
        name: e.name,
        adminLang: e.adminLang,
        printDesigner: e.printDesigner,
        domain: cleanDomain(e.primary),
        aliases: e.aliases
          .split(/[\s,]+/)
          .map(cleanDomain)
          .filter(Boolean),
      },
    });
    editing[s.id] = undefined;
    // The admin menu and the block library of the site the owner is in follow its print designer setting.
    if (s.current) await fetchMe();
    await refresh();
  });

const removeSite = (s: SiteRow) =>
  run(async () => {
    const typed = prompt(
      translate(
        'This deletes {domain} and everything in it: pages, collections, media, settings, users and messages. Type {domain} to confirm.',
        {
          domain: s.primary,
        },
      ),
    );
    if (typed === null) return;
    await api(`/admin/sites/${s.id}`, { method: 'DELETE', body: { confirm: typed } });
    await refresh();
  });

const checkSeo = (s: SiteRow) =>
  run(async () => {
    if (seo[s.id] && seo[s.id] !== 'loading') return void delete seo[s.id];
    seo[s.id] = 'loading';
    seo[s.id] = await api<SeoCheck>(`/admin/sites/${s.id}/seo-check`);
  });

const inviteOwner = () =>
  run(async () => {
    const res = await api<{ link: string; emailed: boolean }>('/admin/sites/owners', {
      method: 'POST',
      body: { email: ownerInvite.email },
    });
    ownerInvite.link = res.link;
    ownerInvite.email = '';
    await refresh();
  });

const sslLabel: Record<SslState, string> = {
  none: 'No SSL',
  queued: 'Waiting to start',
  running: 'Issuing certificate…',
  active: 'Secure (HTTPS)',
  failed: 'SSL failed',
};
const sslClass: Record<SslState, string> = {
  none: 'bg-slate-100 text-slate-600',
  queued: 'bg-sky-100 text-sky-800',
  running: 'bg-sky-100 text-sky-800',
  active: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-700',
};
const stepLabel: Record<string, string> = {
  queued: 'Requested',
  dns: 'DNS check',
  challenge: 'Let’s Encrypt can reach the site',
  certificate: 'Certificate',
  nginx: 'Proxy configuration',
  reload: 'Proxy reload',
  verify: 'HTTPS check',
  renewed: 'Renewed',
  removed: 'SSL turned off',
};

const date = (d: string | null) => (d ? new Date(d).toLocaleDateString(numberLocale.value) : '—');
const time = (d: string) => new Date(d).toLocaleString(numberLocale.value, { dateStyle: 'short', timeStyle: 'medium' });
const daysLeft = (d: string | null) => (d ? Math.round((new Date(d).getTime() - Date.now()) / 86_400_000) : null);

// While a certificate is being issued, follow it closely; otherwise check now and then (renewals, other owners).
let timer: ReturnType<typeof setInterval> | undefined;
let lastFetch = 0;
async function tick() {
  if (busy.value || (!working.value && Date.now() - lastFetch < 30_000)) return;
  lastFetch = Date.now();
  await refresh();
}
onMounted(async () => {
  if (!isOwner.value) return void (await navigateTo('/admin'));
  lastFetch = Date.now();
  await refresh();
  timer = setInterval(tick, 3000);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black">{{ $t('Sites') }}</h1>
        <p class="mt-1 max-w-2xl text-sm font-light text-slate-500">
          {{ $t('Every website in this installation. Each has its own pages, collections, media, settings, users and messages.') }}
        </p>
      </div>
      <button type="button" class="btn-dark" @click="showAdd = !showAdd"><i class="mdi mdi-plus" /> {{ $t('Add site') }}</button>
    </div>

    <p
      v-if="data && !agentOnline"
      class="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200"
      data-testid="agent-offline"
    >
      <i class="mdi mdi-alert-outline" />
      {{ $t('The domains agent is not running, so certificates cannot be issued yet. See “Several sites” in DEPLOY.md.') }}
    </p>

    <form v-if="showAdd" class="mt-6 rounded-[2rem] bg-white p-7 shadow-sm" data-testid="add-site" @submit.prevent="addSite">
      <h2 class="font-black">{{ $t('Add site') }}</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label class="field-label" for="site-domain">{{ $t('Address') }}</label>
          <input id="site-domain" v-model="form.domain" class="input" dir="ltr" placeholder="another.com" required />
          <label class="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <input v-model="form.www" type="checkbox" class="h-4 w-4 rounded" />
            {{ $t('Also www.{domain} (redirects to it)', { domain: domain || 'another.com' }) }}
          </label>
        </div>
        <div>
          <label class="field-label" for="site-name">{{ $t('Name') }}</label>
          <input id="site-name" v-model="form.name" class="input" :placeholder="domain" />
        </div>
        <div>
          <label class="field-label" for="site-admin">{{ $t('Invite an admin for this site (optional)') }}</label>
          <input id="site-admin" v-model="form.adminEmail" type="email" class="input" dir="ltr" placeholder="owner@another.com" />
        </div>
        <div>
          <label class="field-label" for="site-admin-lang">{{ $t('Admin panel language') }}</label>
          <select id="site-admin-lang" v-model="form.adminLang" class="input" data-testid="site-admin-lang">
            <option v-for="l in adminLangs" :key="l.code" :value="l.code">{{ $t(l.label) }}</option>
          </select>
          <p class="mt-1 text-xs text-slate-500">{{ $t('The site’s admin opens in it until a person picks another language there.') }}</p>
        </div>
        <div>
          <label class="field-label" for="site-default-locale">{{ $t('Site language') }}</label>
          <select id="site-default-locale" v-model="form.defaultLocale" class="input" data-testid="site-default-locale">
            <option v-for="l in locales" :key="l.code" :value="l.code">{{ l.label }}</option>
            <option value="">{{ $t('Each visitor’s browser language') }}</option>
          </select>
          <p class="mt-1 text-xs text-slate-500">{{ $t('What visitors see first. The site’s admin can change it in Settings.') }}</p>
        </div>
        <div class="space-y-2 self-end pb-1 text-sm">
          <label class="flex items-center gap-2">
            <input v-model="form.ssl" type="checkbox" class="h-4 w-4 rounded" data-testid="issue-ssl" />
            {{ $t('Issue an SSL certificate now') }}
          </label>
          <label class="flex items-center gap-2">
            <input v-model="form.demo" type="checkbox" class="h-4 w-4 rounded" /> {{ $t('Start with the demo pages') }}
          </label>
          <label class="flex items-center gap-2">
            <input v-model="form.printDesigner" type="checkbox" class="h-4 w-4 rounded" data-testid="site-print-designer" />
            {{ $t('Allow the sublimation designer and Print orders') }}
          </label>
        </div>
      </div>
      <div class="mt-5 rounded-2xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
        <p class="font-semibold">{{ $t('Before you add it') }}</p>
        <p class="mt-1">
          {{ $t('At your domain registrar, point an A record for {domain} to this server', { domain: domain || 'another.com' }) }}
          <code v-if="data?.agent?.serverIp" class="rounded bg-white px-1.5 py-0.5 font-mono" dir="ltr">{{ data.agent.serverIp }}</code
          ><template v-if="addAliases.length"> {{ $t('(and the same for {alias})', { alias: addAliases[0] }) }}</template
          >.
          {{ $t('A certificate can only be issued once that works; until then you can add the site without SSL and issue it later.') }}
        </p>
      </div>
      <div class="mt-6 flex gap-2">
        <button type="submit" class="btn-dark" :disabled="busy || !domain">{{ $t('Add site') }}</button>
        <button type="button" class="btn-light" @click="showAdd = false">{{ $t('Cancel') }}</button>
      </div>
    </form>

    <div v-if="added" class="mt-6 rounded-[2rem] bg-emerald-50 p-6 text-sm text-emerald-900 ring-1 ring-emerald-200" role="status">
      <p class="font-semibold">{{ $t('{domain} was added.', { domain: added.site.primary }) }}</p>
      <p v-if="added.invite" class="mt-2">
        {{ $t('Admin invitation for {email}:', { email: added.invite.email }) }}
        <input
          :value="added.invite.link"
          readonly
          class="input mt-2 text-xs"
          dir="ltr"
          @focus="($event.target as HTMLInputElement).select()"
        />
      </p>
      <button type="button" class="btn-light mt-3" @click="added = null">{{ $t('Close') }}</button>
    </div>

    <p v-if="error" class="mt-6 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>

    <div v-if="!data" class="mt-8 h-40 animate-pulse rounded-[2rem] bg-white" />
    <div v-else class="mt-8 space-y-4">
      <article
        v-for="s in data.sites"
        :key="s.id"
        class="rounded-[2rem] bg-white p-6 shadow-sm"
        :data-site="s.primary"
        :class="{ 'ring-2 ring-[#00a998]/40': s.current }"
      >
        <div class="flex flex-wrap items-start gap-4">
          <div class="min-w-0 flex-1">
            <h2 class="flex flex-wrap items-center gap-2 text-lg font-black">
              {{ s.name || s.primary }}
              <span v-if="s.current" class="rounded-full bg-[#00a998]/10 px-2 py-0.5 text-[11px] font-semibold text-[#00796d]">{{
                $t('you are here')
              }}</span>
            </h2>
            <a :href="here(s.url)" target="_blank" class="text-sm text-slate-500 underline-offset-2 hover:underline" dir="ltr">{{
              s.url
            }}</a>
            <p v-if="s.aliases.length" class="mt-1 text-xs text-slate-400" dir="ltr">
              <i class="mdi mdi-arrow-right-bottom" /> {{ s.aliases.join(', ') }}
            </p>
            <p class="mt-1 text-xs text-slate-400" data-testid="site-admin-lang">
              <i class="mdi mdi-translate" /> {{ $t('Admin panel language') }}: {{ $t(adminLangLabel(s.adminLang)) }}
            </p>
            <p v-if="s.printDesigner" class="mt-1 text-xs text-slate-400" data-testid="site-print-designer">
              <i class="mdi mdi-tshirt-crew-outline" /> {{ $t('Sublimation designer allowed') }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="btn-light" :disabled="busy" @click="openAdmin(s)">
              <i class="mdi mdi-pencil-outline" /> {{ $t('Open admin') }}
            </button>
            <button type="button" class="btn-light" :disabled="busy" @click="checkSeo(s)">
              <i class="mdi mdi-magnify" /> {{ $t('SEO check') }}
            </button>
            <button type="button" class="btn-light !px-3" :title="$t('Edit name, addresses and admin language')" @click="startEdit(s)">
              <i class="mdi mdi-cog-outline" />
            </button>
            <button
              v-if="!s.current"
              type="button"
              class="btn-light !px-3 hover:!text-red-600"
              :title="$t('Delete site')"
              @click="removeSite(s)"
            >
              <i class="mdi mdi-delete-outline" />
            </button>
          </div>
        </div>

        <!-- Certificate -->
        <div class="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm" data-testid="ssl">
          <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="sslClass[s.ssl]" :data-ssl="s.ssl">
            <i v-if="s.ssl === 'running' || s.ssl === 'queued'" class="mdi mdi-loading mdi-spin" />
            <i v-else-if="s.ssl === 'active'" class="mdi mdi-lock" />
            {{ $t(sslLabel[s.ssl]) }}
          </span>
          <span v-if="s.ssl === 'active' && s.sslExpires" class="text-xs text-slate-500">
            {{ $t('Valid until {date}; renews by itself', { date: date(s.sslExpires) }) }}
            <span v-if="(daysLeft(s.sslExpires) ?? 99) < 14" class="font-semibold text-amber-700">
              ({{ $t('{n} days left', { n: daysLeft(s.sslExpires) ?? 0 }) }})
            </span>
          </span>
          <span v-if="s.sslMessage && s.ssl !== 'active'" class="min-w-0 flex-1 truncate text-xs text-slate-500" :title="s.sslMessage">{{
            s.sslMessage
          }}</span>
          <span v-if="s.ssl === 'failed' && s.sslRetryAt" class="text-xs text-slate-400">
            {{ $t('Tries again at {time}', { time: time(s.sslRetryAt) }) }}
          </span>
          <div class="ms-auto flex flex-wrap gap-2">
            <button
              v-if="s.sslMode === 'off' || s.ssl === 'failed'"
              type="button"
              class="btn-dark !py-1.5 text-xs"
              :disabled="busy"
              data-testid="request-ssl"
              @click="requestSsl(s)"
            >
              <i class="mdi mdi-lock-plus-outline" /> {{ $t(s.ssl === 'failed' ? 'Try again now' : 'Issue SSL') }}
            </button>
            <button v-else-if="s.ssl === 'active'" type="button" class="btn-light !py-1.5 text-xs" :disabled="busy" @click="requestSsl(s)">
              <i class="mdi mdi-refresh" /> {{ $t('Renew now') }}
            </button>
            <button
              v-if="s.sslMode === 'requested'"
              type="button"
              class="btn-light !py-1.5 text-xs"
              :disabled="busy"
              @click="turnOffSsl(s)"
            >
              {{ $t('Turn SSL off') }}
            </button>
            <button type="button" class="btn-light !py-1.5 text-xs" @click="toggleTimeline(s.id)">
              <i class="mdi" :class="openTimeline[s.id] ? 'mdi-chevron-up' : 'mdi-timeline-text-outline'" /> {{ $t('Progress') }}
            </button>
          </div>
          <ol v-if="openTimeline[s.id]" class="mt-2 w-full space-y-1.5 border-t border-slate-200 pt-3" data-testid="ssl-timeline">
            <li v-if="!events[s.id]?.length" class="text-xs text-slate-400">{{ $t('Nothing yet.') }}</li>
            <li
              v-for="e in [...(events[s.id] ?? [])].reverse()"
              :key="e.id"
              class="flex gap-3 text-xs"
              :data-step="e.step"
              :data-state="e.state"
            >
              <i
                class="mdi mt-0.5"
                :class="{
                  'mdi-check-circle text-emerald-600': e.state === 'ok',
                  'mdi-close-circle text-red-600': e.state === 'failed',
                  'mdi-loading mdi-spin text-sky-600': e.state === 'running',
                }"
              />
              <span class="w-36 shrink-0 font-semibold">{{ $t(stepLabel[e.step] ?? e.step) }}</span>
              <span class="min-w-0 flex-1 whitespace-pre-wrap break-words text-slate-600" dir="auto">{{ e.message }}</span>
              <time class="shrink-0 text-slate-400" dir="ltr">{{ time(e.createdAt) }}</time>
            </li>
          </ol>
        </div>

        <!-- Name, addresses and admin language -->
        <form v-if="editing[s.id]" class="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-3" @submit.prevent="saveEdit(s)">
          <div>
            <label class="field-label">{{ $t('Name') }}</label>
            <input v-model="editing[s.id]!.name" class="input" />
          </div>
          <div>
            <label class="field-label">{{ $t('Main address') }}</label>
            <input v-model="editing[s.id]!.primary" class="input" dir="ltr" required />
          </div>
          <div>
            <label class="field-label">{{ $t('Other addresses (one per line)') }}</label>
            <textarea v-model="editing[s.id]!.aliases" rows="2" class="input" dir="ltr" />
          </div>
          <div>
            <label class="field-label">{{ $t('Admin panel language') }}</label>
            <select v-model="editing[s.id]!.adminLang" class="input">
              <option v-for="l in adminLangs" :key="l.code" :value="l.code">{{ $t(l.label) }}</option>
            </select>
          </div>
          <label class="flex items-center gap-2 self-end pb-2 text-sm">
            <input v-model="editing[s.id]!.printDesigner" type="checkbox" class="h-4 w-4 rounded" data-testid="edit-print-designer" />
            {{ $t('Allow the sublimation designer and Print orders') }}
          </label>
          <p class="self-end text-xs text-slate-500">
            {{ $t('With SSL on, changing the addresses asks for a new certificate covering them.') }}
          </p>
          <div class="flex justify-end gap-2">
            <button type="submit" class="btn-dark" :disabled="busy">{{ $t('Save') }}</button>
            <button type="button" class="btn-light" @click="editing[s.id] = undefined">{{ $t('Cancel') }}</button>
          </div>
        </form>

        <!-- SEO check -->
        <div v-if="seo[s.id]" class="mt-4 rounded-2xl bg-slate-50 p-4 text-sm" data-testid="seo-check">
          <div v-if="seo[s.id] === 'loading'" class="h-10 animate-pulse rounded-xl bg-slate-200" />
          <template v-else-if="typeof seo[s.id] === 'object'">
            <div class="flex flex-wrap items-center gap-4">
              <span
                class="flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white"
                :class="
                  (seo[s.id] as SeoCheck).score >= 80
                    ? 'bg-emerald-600'
                    : (seo[s.id] as SeoCheck).score >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-600'
                "
                >{{ (seo[s.id] as SeoCheck).score }}</span
              >
              <p class="text-xs text-slate-600">
                {{ $t('{n} addresses for search engines', { n: (seo[s.id] as SeoCheck).urls }) }} ·
                <a :href="(seo[s.id] as SeoCheck).sitemap" target="_blank" class="underline" dir="ltr">sitemap.xml</a>
              </p>
            </div>
            <ul class="mt-3 space-y-1.5">
              <li v-if="!(seo[s.id] as SeoCheck).issues.length" class="text-xs text-emerald-700">
                <i class="mdi mdi-check-circle" /> {{ $t('Nothing to fix.') }}
              </li>
              <li v-for="(issue, i) in (seo[s.id] as SeoCheck).issues" :key="i" class="flex gap-2 text-xs">
                <i class="mdi mt-0.5" :class="issue.level === 'error' ? 'mdi-alert-circle text-red-600' : 'mdi-alert text-amber-500'" />
                <span>
                  {{ $t(issue.message) }}
                  <span v-if="issue.where" class="text-slate-400">— {{ issue.where }}</span>
                </span>
              </li>
            </ul>
          </template>
        </div>
      </article>
    </div>

    <section v-if="data" class="mt-10 rounded-[2rem] bg-white p-7 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-black">{{ $t('Owners') }}</h2>
          <p class="mt-1 text-xs text-slate-400">
            {{ $t('Owners can add, change and delete every site, and edit each one as an admin.') }}
          </p>
        </div>
        <button type="button" class="btn-light" @click="ownerInvite.open = !ownerInvite.open">
          <i class="mdi mdi-account-plus-outline" /> {{ $t('Invite an owner') }}
        </button>
      </div>
      <form v-if="ownerInvite.open" class="mt-4 flex flex-wrap gap-2" @submit.prevent="inviteOwner">
        <input v-model="ownerInvite.email" type="email" class="input max-w-xs" dir="ltr" required placeholder="partner@example.com" />
        <button type="submit" class="btn-dark" :disabled="busy">{{ $t('Invite') }}</button>
      </form>
      <input
        v-if="ownerInvite.link"
        :value="ownerInvite.link"
        readonly
        class="input mt-3 text-xs"
        dir="ltr"
        @focus="($event.target as HTMLInputElement).select()"
      />
      <ul class="mt-4 divide-y divide-slate-100 text-sm">
        <li v-for="o in data.owners" :key="o.id" class="flex items-center justify-between py-2">
          <span dir="ltr"
            >{{ o.email }} <span v-if="o.id === user?.id" class="text-xs text-slate-400">({{ $t('you') }})</span></span
          >
          <span class="text-xs text-slate-400">{{ $t('Last login') }}: {{ date(o.lastLoginAt) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
