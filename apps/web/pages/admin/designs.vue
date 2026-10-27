<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });

type Status = 'new' | 'called' | 'production' | 'done' | 'cancelled';

interface DesignRequest {
  id: string;
  pageId: string | null;
  pageTitle: string;
  locale: string;
  status: Status;
  name: string;
  phone: string;
  email: string;
  notes: string;
  product: string;
  surface: string;
  color: string;
  material: string;
  size: string;
  quantity: number;
  details: { printCm: [number, number]; printPx: [number, number]; layers: string[]; background: string };
  adminNote: string;
  printType: string;
  printBytes: number;
  createdAt: string;
}

const statuses: { key: Status; label: string; icon: string; cls: string }[] = [
  { key: 'new', label: 'New', icon: 'mdi-star-four-points-outline', cls: 'bg-[#00a998] text-white' },
  { key: 'called', label: 'Called back', icon: 'mdi-phone-check-outline', cls: 'bg-sky-100 text-sky-700' },
  { key: 'production', label: 'In production', icon: 'mdi-printer-outline', cls: 'bg-amber-100 text-amber-700' },
  { key: 'done', label: 'Done', icon: 'mdi-check-circle-outline', cls: 'bg-emerald-100 text-emerald-700' },
  { key: 'cancelled', label: 'Cancelled', icon: 'mdi-close-circle-outline', cls: 'bg-slate-200 text-slate-600' },
];
const statusOf = (key: Status) => statuses.find((s) => s.key === key) ?? statuses[0];

const api = useApi();
const newCount = useState<number>('designs-new', () => 0);
const items = ref<DesignRequest[]>([]);
const loading = ref(true);
const filter = ref<Status | 'all' | 'open'>('open');
const selectedId = ref<string | null>(null);
const error = ref('');
const note = ref('');
const savingNote = ref(false);

const open = (s: Status) => s === 'new' || s === 'called' || s === 'production';
const visible = computed(() =>
  items.value.filter((d) => filter.value === 'all' || (filter.value === 'open' ? open(d.status) : d.status === filter.value)),
);
const selected = computed(() => items.value.find((d) => d.id === selectedId.value) ?? null);
const countOf = (s: Status) => items.value.filter((d) => d.status === s).length;

watch(selected, (d) => (note.value = d?.adminNote ?? ''));

const fileUrl = (d: DesignRequest, which: 'preview' | 'print', download = false) =>
  `/api/admin/designs/${d.id}/${which}${download ? '?download=1' : ''}`;

/** The number as it is dialled: Persian digits to Latin, spaces and dashes removed. */
function dial(phone: string) {
  return phone
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[^\d+]/g, '');
}

/** WhatsApp wants the number with its country code and no plus; Iranian numbers starting with 0 get 98. */
function whatsapp(phone: string) {
  const n = dial(phone).replace(/^\+/, '').replace(/^00/, '');
  return `https://wa.me/${n.startsWith('0') ? `98${n.slice(1)}` : n}`;
}

function when(date: string) {
  return new Date(date).toLocaleString(adminLocale(), { dateStyle: 'medium', timeStyle: 'short' });
}

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const dpi = (d: DesignRequest) => (d.details.printCm[0] ? Math.round(d.details.printPx[0] / (d.details.printCm[0] / 2.54)) : 0);

async function load() {
  loading.value = true;
  try {
    items.value = await api<DesignRequest[]>('/admin/designs');
    newCount.value = countOf('new');
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function setStatus(d: DesignRequest, status: Status) {
  if (d.status === status) return;
  const before = d.status;
  d.status = status;
  newCount.value = countOf('new');
  try {
    await api(`/admin/designs/${d.id}`, { method: 'PATCH', body: { status } });
  } catch (err) {
    d.status = before;
    newCount.value = countOf('new');
    error.value = apiErrorMessage(err);
  }
}

async function saveNote() {
  const d = selected.value;
  if (!d || note.value === d.adminNote) return;
  savingNote.value = true;
  try {
    await api(`/admin/designs/${d.id}`, { method: 'PATCH', body: { adminNote: note.value } });
    d.adminNote = note.value;
  } catch (err) {
    error.value = apiErrorMessage(err);
  } finally {
    savingNote.value = false;
  }
}

/** Calling marks a new design as called back, the usual next step. */
function called(d: DesignRequest) {
  if (d.status === 'new') setStatus(d, 'called');
}

async function remove(d: DesignRequest) {
  if (!confirm(translate('Delete this design? This cannot be undone.'))) return;
  await api(`/admin/designs/${d.id}`, { method: 'DELETE' });
  items.value = items.value.filter((x) => x.id !== d.id);
  newCount.value = countOf('new');
  selectedId.value = null;
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black">{{ $t('Print orders') }}</h1>
        <p class="mt-1 text-sm font-light text-slate-500">
          {{ $t('Designs visitors made with the sublimation designer block. Call them back, then move each order along.') }}
        </p>
      </div>
      <div class="flex flex-wrap rounded-full bg-white p-1 text-xs shadow-sm">
        <button
          v-for="f in ['open', 'all', ...statuses.map((s) => s.key)] as const"
          :key="f"
          type="button"
          class="rounded-full px-3 py-1.5 transition"
          :class="filter === f ? 'bg-slate-900 text-white' : 'text-slate-500'"
          @click="filter = f"
        >
          {{ f === 'open' ? $t('Open') : f === 'all' ? $t('All') : $t(statusOf(f).label) }}
          <span v-if="f === 'new' && newCount" class="ms-1 rounded-full bg-[#00a998] px-1.5 text-[10px] font-bold text-white">{{
            newCount
          }}</span>
        </button>
      </div>
    </div>

    <p v-if="error" class="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>

    <div class="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
      <div class="space-y-2">
        <div v-if="loading" class="h-24 animate-pulse rounded-[1.5rem] bg-white" />
        <button
          v-for="d in visible"
          :key="d.id"
          type="button"
          class="flex w-full items-center gap-3 rounded-[1.5rem] bg-white p-3 text-start shadow-sm ring-1 transition hover:shadow-md"
          :class="selectedId === d.id ? 'ring-2 ring-slate-900' : 'ring-slate-200/60'"
          @click="selectedId = d.id"
        >
          <img :src="fileUrl(d, 'preview')" alt="" loading="lazy" class="h-16 w-16 shrink-0 rounded-2xl bg-slate-100 object-cover" />
          <span class="min-w-0 flex-1">
            <span class="flex items-center justify-between gap-2">
              <span class="truncate text-sm" :class="d.status === 'new' ? 'font-black' : 'font-medium'">{{ d.name }}</span>
              <span class="shrink-0 text-[11px] text-slate-400">{{ new Date(d.createdAt).toLocaleDateString(adminLocale()) }}</span>
            </span>
            <span class="mt-0.5 block truncate text-xs text-slate-500" dir="ltr">{{ d.phone }}</span>
            <span class="mt-1 flex items-center gap-2 text-xs">
              <span class="rounded-full px-2 py-0.5 text-[10px] font-medium" :class="statusOf(d.status).cls">{{
                $t(statusOf(d.status).label)
              }}</span>
              <span class="truncate text-slate-500">{{ d.product }} × {{ d.quantity }}</span>
            </span>
          </span>
        </button>
        <p v-if="!loading && !visible.length" class="py-16 text-center text-sm text-slate-400">
          {{ $t('No designs here yet. Add the “Sublimation designer” block to a page so visitors can send theirs.') }}
        </p>
      </div>

      <section v-if="selected" class="h-fit rounded-[2rem] bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-xl font-black" :dir="selected.locale === 'fa' ? 'rtl' : 'ltr'">{{ selected.name }}</h2>
            <p class="text-xs text-slate-400">
              {{ when(selected.createdAt) }} ·
              {{ $t('from the {locale} page “{page}”', { locale: selected.locale.toUpperCase(), page: selected.pageTitle }) }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <a :href="`tel:${dial(selected.phone)}`" class="btn-dark" @click="called(selected)">
              <i class="mdi mdi-phone" /> <span dir="ltr">{{ selected.phone }}</span>
            </a>
            <a :href="whatsapp(selected.phone)" target="_blank" rel="noopener" class="btn-light" @click="called(selected)">
              <i class="mdi mdi-whatsapp" /> {{ $t('WhatsApp') }}
            </a>
            <a v-if="selected.email" :href="`mailto:${selected.email}`" class="btn-light"
              ><i class="mdi mdi-email-outline" /> {{ $t('Email') }}</a
            >
            <button type="button" class="btn-icon hover:!text-red-600" :title="$t('Delete')" @click="remove(selected)">
              <i class="mdi mdi-trash-can-outline text-lg" />
            </button>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap gap-1.5">
          <button
            v-for="s in statuses"
            :key="s.key"
            type="button"
            class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition"
            :class="
              selected.status === s.key ? `${s.cls} border-transparent font-bold` : 'border-slate-200 text-slate-500 hover:border-slate-400'
            "
            @click="setStatus(selected, s.key)"
          >
            <i class="mdi" :class="s.icon" /> {{ $t(s.label) }}
          </button>
        </div>

        <div class="mt-6 grid gap-6 xl:grid-cols-2">
          <div class="space-y-3">
            <a :href="fileUrl(selected, 'preview')" target="_blank" class="block overflow-hidden rounded-3xl bg-slate-100">
              <img :src="fileUrl(selected, 'preview')" :alt="$t('Preview')" class="w-full" />
            </a>
            <div class="rounded-3xl bg-[conic-gradient(#e2e8f0_25%,#fff_0_50%,#e2e8f0_0_75%,#fff_0)] bg-[length:20px_20px] p-3">
              <img :src="fileUrl(selected, 'print')" :alt="$t('Print file')" class="mx-auto max-h-72 object-contain" />
            </div>
            <a :href="fileUrl(selected, 'print', true)" class="btn-dark w-full flex-wrap">
              <i class="mdi mdi-download" /> {{ $t('Download the print file') }}
              <span class="text-xs font-normal opacity-70" dir="ltr"
                >{{ selected.printType === 'image/png' ? 'PNG' : 'JPEG' }} · {{ selected.details.printPx.join(' × ') }} px ·
                {{ megabytes(selected.printBytes) }}</span
              >
            </a>
          </div>

          <div class="space-y-4">
            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
              <dt class="text-slate-500">{{ $t('Product') }}</dt>
              <dd class="font-medium">{{ selected.product }}</dd>
              <template v-if="selected.size">
                <dt class="text-slate-500">{{ $t('Size') }}</dt>
                <dd>{{ selected.size }}</dd>
              </template>
              <dt class="text-slate-500">{{ $t('Quantity') }}</dt>
              <dd>{{ selected.quantity }}</dd>
              <template v-if="selected.material">
                <dt class="text-slate-500">{{ $t('Fabric') }}</dt>
                <dd>{{ selected.material }}</dd>
              </template>
              <template v-if="selected.color">
                <dt class="text-slate-500">{{ $t('Base color') }}</dt>
                <dd class="flex items-center gap-2">
                  <span class="inline-block h-4 w-4 rounded-full border border-slate-300" :style="{ background: selected.color }" />
                  <span dir="ltr">{{ selected.color }}</span>
                </dd>
              </template>
              <dt class="text-slate-500">{{ $t('Print area') }}</dt>
              <dd dir="ltr" class="text-start">{{ selected.details.printCm.join(' × ') }} cm · {{ dpi(selected) }} dpi</dd>
              <dt class="text-slate-500">{{ $t('Background') }}</dt>
              <dd dir="ltr" class="text-start">{{ selected.details.background }}</dd>
            </dl>

            <div v-if="selected.details.layers.length" class="rounded-2xl bg-slate-50 p-4">
              <p class="text-xs font-medium text-slate-500">{{ $t('Layers (bottom to top)') }}</p>
              <ul class="mt-2 space-y-1 text-sm" dir="auto">
                <li v-for="(l, i) in selected.details.layers" :key="i" class="break-words">{{ l }}</li>
              </ul>
            </div>

            <div v-if="selected.notes" class="rounded-2xl bg-slate-50 p-4" :dir="selected.locale === 'fa' ? 'rtl' : 'ltr'">
              <p class="text-xs font-medium text-slate-500">{{ $t('Notes from the customer') }}</p>
              <p class="mt-1 whitespace-pre-line break-words text-sm">{{ selected.notes }}</p>
            </div>

            <label class="block">
              <span class="field-label">{{ $t('Your notes (only admins see them)') }}</span>
              <textarea
                v-model="note"
                rows="4"
                class="input"
                :placeholder="$t('What was agreed on the phone, price, delivery date…')"
                @blur="saveNote"
              />
              <span v-if="savingNote" class="text-xs text-slate-400">{{ $t('Saving…') }}</span>
            </label>
          </div>
        </div>
      </section>
      <div
        v-else-if="visible.length"
        class="hidden items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 text-sm text-slate-400 lg:flex"
      >
        {{ $t('Select a design to see it.') }}
      </div>
    </div>
  </div>
</template>
