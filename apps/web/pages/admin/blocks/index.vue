<script setup lang="ts">
/**
 * The AI block builder: the admin describes a block, the AI writes it (fields + Vue component), the API checks and
 * compiles it, and it is tried here in a sandboxed preview. Only the owner can approve a block; then it appears in
 * the page editor under "Custom blocks (AI)". Further requests and code edits stay in the draft until approved again.
 */
import { fontNames, resolveTheme, type BlockDef, type ThemeTokens } from '@profiterol/blocks';
import AiConnections, { type AiConnectionView } from '~/components/admin/AiConnections.vue';
import CustomBlockPreview from '~/components/admin/CustomBlockPreview.vue';
import FieldInput from '~/components/admin/FieldInput.vue';

definePageMeta({ layout: 'admin', middleware: 'admin' });

interface Version {
  def: BlockDef;
  source: string;
  compiled: string;
  hash: string;
}

interface CustomBlockView {
  id: string;
  type: string;
  status: 'draft' | 'live' | 'disabled';
  label: string;
  icon: string;
  draft: Version;
  live: { hash: string; url: string } | null;
  changed: boolean;
  conversation: { role: 'user' | 'assistant'; text: string; at: string; author?: string; model?: string }[];
  createdBy: string;
  approvedBy: string;
  updatedAt: string;
}

const api = useApi();
const route = useRoute();
const router = useRouter();
const { isAdmin, isOwner } = useAuth();
const { t } = useAdminI18n();

const list = ref<CustomBlockView[]>([]);
/** The signed-in admin's own AI models on this site, and the one the next request goes to. */
const connections = ref<AiConnectionView[] | null>(null);
const connectionId = ref('');
const ready = computed(() => Boolean(connections.value?.length));
const showModels = ref(false);
function onConnections(list: AiConnectionView[]) {
  // Starting with none: keep the panel open after the first one is added, so its confirmation shows.
  if (!list.length) showModels.value = true;
  connections.value = list;
  if (!list.some((c) => c.id === connectionId.value)) connectionId.value = list.find((c) => c.isDefault)?.id ?? list[0]?.id ?? '';
}
const modelsPanel = ref<InstanceType<typeof AiConnections>>();
const theme = ref<ThemeTokens>(resolveTheme(undefined, null, []));
const selected = computed(() => list.value.find((b) => b.id === route.query.id) ?? null);
// With nothing picked, the page opens on a new request.
const creating = computed(() => !selected.value);

const prompt = ref('');
const busy = ref(false);
const error = ref('');
const previewError = ref('');
const tab = ref<'preview' | 'code'>('preview');
const device = ref<'desktop' | 'mobile'>('desktop');
const locale = ref('en');

/** Values tried in the preview's form; they start as the block's defaults and are never saved. */
const values = ref<Record<string, unknown>>({});
const ownFields = computed(() => selected.value?.draft.def.fields ?? []);

// The code tab edits a copy; saving sends it to the API, which checks it like the AI's answers.
const editSource = ref('');
const editDef = ref('');

function resetEditors(block: CustomBlockView | null) {
  if (!block) return;
  const { fields, defaults } = block.draft.def;
  const kept = Object.fromEntries(Object.entries(values.value).filter(([k]) => fields.some((f) => f.key === k)));
  values.value = { ...JSON.parse(JSON.stringify(defaults)), ...kept };
  editSource.value = block.draft.source;
  const { label, icon, description } = block.draft.def;
  editDef.value = JSON.stringify({ label, icon, description, fields, defaults }, null, 2);
  previewError.value = '';
}
watch(selected, (b, old) => {
  if (b?.id !== old?.id) values.value = {};
  resetEditors(b);
});

async function load() {
  try {
    const [blocks, settings] = await Promise.all([
      api<CustomBlockView[]>('/admin/custom-blocks'),
      api<{ theme: Partial<ThemeTokens>; fonts: { name: string }[] }>('/admin/settings'),
    ]);
    list.value = blocks;
    theme.value = resolveTheme(settings.theme, null, fontNames(settings.fonts));
    resetEditors(selected.value);
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
}

function replace(block: CustomBlockView) {
  const i = list.value.findIndex((b) => b.id === block.id);
  if (i >= 0) list.value[i] = block;
  else list.value.unshift(block);
  resetEditors(block);
}

async function run(work: () => Promise<void>) {
  busy.value = true;
  error.value = '';
  try {
    await work();
  } catch (err) {
    const problems = (err as { data?: { problems?: string[] } }).data?.problems;
    error.value = [apiErrorMessage(err), ...(problems ?? []).map((p) => `• ${p}`)].join('\n');
  } finally {
    busy.value = false;
    // Today's request counts changed.
    modelsPanel.value?.load();
  }
}

const ask = () =>
  run(async () => {
    const text = prompt.value.trim();
    if (!text) return;
    const body = { prompt: text, connectionId: connectionId.value || undefined };
    const block = selected.value
      ? await api<CustomBlockView>(`/admin/custom-blocks/${selected.value.id}/refine`, { method: 'POST', body })
      : await api<CustomBlockView>('/admin/custom-blocks', { method: 'POST', body });
    replace(block);
    prompt.value = '';
    tab.value = 'preview';
    if (!selected.value) router.replace({ query: { id: block.id } });
  });

const saveCode = () =>
  run(async () => {
    let def: unknown;
    try {
      def = JSON.parse(editDef.value);
    } catch {
      throw new Error(t('The definition is not valid JSON.'));
    }
    replace(
      await api<CustomBlockView>(`/admin/custom-blocks/${selected.value!.id}/draft`, {
        method: 'PUT',
        body: { def, source: editSource.value },
      }),
    );
  });

const action = (name: 'approve' | 'disable' | 'enable') =>
  run(async () => {
    if (name === 'approve' && !confirm(t('Approve this block? Its code will run for everyone who opens pages that use it.'))) return;
    replace(await api<CustomBlockView>(`/admin/custom-blocks/${selected.value!.id}/${name}`, { method: 'POST' }));
  });

const remove = () =>
  run(async () => {
    if (!confirm(t('Delete this block for good?'))) return;
    await api(`/admin/custom-blocks/${selected.value!.id}`, { method: 'DELETE' });
    list.value = list.value.filter((b) => b.id !== selected.value!.id);
    router.replace({ query: {} });
  });

const statusLabel = (b: CustomBlockView) =>
  b.status === 'live' ? (b.changed ? 'In use · changes not approved' : 'In use') : b.status === 'disabled' ? 'Disabled' : 'Draft';
const statusClass = (b: CustomBlockView) =>
  b.status === 'live'
    ? b.changed
      ? 'bg-amber-100 text-amber-800'
      : 'bg-emerald-100 text-emerald-800'
    : b.status === 'disabled'
      ? 'bg-slate-200 text-slate-600'
      : 'bg-sky-100 text-sky-800';

const examples = [
  'A pricing table with three plans; the middle one highlighted as "Most popular", each with a feature list and a button.',
  'A timeline of our company history: year, title and a short text for each step, alternating sides on wide screens.',
  'A countdown to a launch date with days, hours, minutes and seconds, a title and a button.',
];

onMounted(load);
</script>

<template>
  <div>
    <h1 class="text-3xl font-black">{{ $t('Custom blocks (AI)') }}</h1>
    <p class="mt-1 max-w-3xl text-sm font-light text-slate-500">
      {{
        $t(
          'Describe a block the editor does not have, and the AI builds it. Try it here; once the owner approves it, it appears in the page editor.',
        )
      }}
    </p>

    <p v-if="!isAdmin" class="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {{ $t('Only admins can build custom blocks.') }}
    </p>
    <template v-else>
      <p v-if="connections && !ready" class="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {{ $t('Connect an AI model first: your provider, the model and your API key.') }}
      </p>
      <div class="mt-6" :class="{ hidden: ready && !showModels }">
        <AiConnections ref="modelsPanel" @change="onConnections" />
      </div>
    </template>

    <div class="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
      <aside class="space-y-2">
        <NuxtLink
          :to="{ query: { id: 'new' } }"
          class="flex items-center gap-2 rounded-2xl bg-[#00a998] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:brightness-110"
        >
          <i class="mdi mdi-creation" /> {{ $t('New block') }}
        </NuxtLink>
        <NuxtLink
          v-for="b in list"
          :key="b.id"
          :to="{ query: { id: b.id } }"
          class="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-[#00a998] hover:ring-1"
          :class="{ 'ring-2': selected?.id === b.id }"
          :data-block="b.type"
        >
          <i class="mdi text-xl text-[#00a998]" :class="b.icon" />
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium">{{ b.label }}</span>
            <span class="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="statusClass(b)">{{
              $t(statusLabel(b))
            }}</span>
          </span>
        </NuxtLink>
        <button v-if="isAdmin && ready" type="button" class="btn-pill mt-2 w-full justify-center text-xs" @click="showModels = !showModels">
          <i class="mdi mdi-key-chain-variant" /> {{ showModels ? $t('Hide your AI models') : $t('Your AI models') }}
        </button>
      </aside>

      <section class="min-w-0">
        <p v-if="error" class="mb-4 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{{ error }}</p>

        <!-- A new block: just the request. -->
        <form v-if="creating" class="rounded-[2rem] bg-white p-6 shadow-sm" @submit.prevent="ask">
          <label class="field-label" for="block-prompt">{{ $t('What should the block show and do?') }}</label>
          <textarea id="block-prompt" v-model="prompt" class="input min-h-32" :placeholder="$t('E.g. a pricing table with three plans…')" />
          <div class="mt-3 flex flex-wrap gap-2">
            <button v-for="ex in examples" :key="ex" type="button" class="btn-pill text-start text-xs" @click="prompt = $t(ex)">
              {{ $t(ex) }}
            </button>
          </div>
          <div class="mt-4 flex items-center gap-3">
            <button type="submit" class="btn-dark" :disabled="busy || !ready || !isAdmin || prompt.trim().length < 3">
              <i class="mdi" :class="busy ? 'mdi-loading mdi-spin' : 'mdi-creation'" />
              {{ busy ? $t('Building… this can take a minute') : $t('Build it') }}
            </button>
            <select v-if="connections && connections.length > 1" v-model="connectionId" class="input !w-auto" :aria-label="$t('AI model')">
              <option v-for="c in connections" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <span v-else-if="connections?.length" class="text-xs text-slate-500">{{
              $t('With {name}', { name: connections[0].name })
            }}</span>
          </div>
        </form>

        <div v-else-if="selected" class="space-y-4">
          <div class="flex flex-wrap items-center gap-3 rounded-[2rem] bg-white p-4 shadow-sm">
            <i class="mdi text-3xl text-[#00a998]" :class="selected.draft.def.icon" />
            <div class="min-w-0 flex-1">
              <h2 class="truncate text-lg font-bold">{{ selected.draft.def.label }}</h2>
              <p class="truncate text-xs text-slate-500">
                {{ selected.draft.def.description }} · <code dir="ltr">{{ selected.type }}</code>
              </p>
            </div>
            <button
              v-if="isOwner && (selected.status === 'draft' || selected.changed)"
              type="button"
              class="btn-dark"
              :disabled="busy || Boolean(previewError)"
              :title="previewError ? $t('Fix the error in the preview first') : ''"
              @click="action('approve')"
            >
              <i class="mdi mdi-check-decagram" /> {{ selected.live ? $t('Approve changes') : $t('Approve for use') }}
            </button>
            <span v-else-if="!isOwner && (selected.status === 'draft' || selected.changed)" class="text-xs text-slate-500">
              {{ $t('Waiting for the owner’s approval') }}
            </span>
            <button v-if="selected.status === 'live'" type="button" class="btn-light" :disabled="busy" @click="action('disable')">
              <i class="mdi mdi-eye-off-outline" /> {{ $t('Disable') }}
            </button>
            <button
              v-if="selected.status === 'disabled' && isOwner"
              type="button"
              class="btn-light"
              :disabled="busy"
              @click="action('enable')"
            >
              <i class="mdi mdi-eye-outline" /> {{ $t('Enable') }}
            </button>
            <button type="button" class="btn-icon hover:!text-red-600" :title="$t('Delete')" :disabled="busy" @click="remove">
              <i class="mdi mdi-trash-can-outline" />
            </button>
          </div>

          <div class="grid gap-4 xl:grid-cols-[1fr_22rem]">
            <div class="min-w-0 space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                <div class="flex rounded-full bg-white p-1 text-xs shadow-sm">
                  <button
                    v-for="x in ['preview', 'code'] as const"
                    :key="x"
                    type="button"
                    class="rounded-full px-3 py-1.5"
                    :class="tab === x ? 'bg-slate-900 text-white' : 'text-slate-600'"
                    @click="tab = x"
                  >
                    {{ x === 'preview' ? $t('Preview') : $t('Code') }}
                  </button>
                </div>
                <template v-if="tab === 'preview'">
                  <div class="flex rounded-full bg-white p-1 text-xs shadow-sm">
                    <button
                      v-for="d in ['desktop', 'mobile'] as const"
                      :key="d"
                      type="button"
                      class="rounded-full px-3 py-1.5"
                      :class="device === d ? 'bg-slate-900 text-white' : 'text-slate-600'"
                      :aria-label="d === 'desktop' ? $t('Desktop') : $t('Phone')"
                      @click="device = d"
                    >
                      <i class="mdi" :class="d === 'desktop' ? 'mdi-monitor' : 'mdi-cellphone'" />
                    </button>
                  </div>
                  <select v-model="locale" class="input !w-auto !py-1 text-xs" :aria-label="$t('Language')">
                    <option value="en">English</option>
                    <option value="fa">فارسی</option>
                  </select>
                </template>
              </div>

              <template v-if="tab === 'preview'">
                <p v-if="previewError" class="whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-700" role="alert">
                  {{ $t('The block failed in the preview:') }} {{ previewError }}
                </p>
                <CustomBlockPreview
                  :code="selected.draft.compiled"
                  :values="values"
                  :locale="locale"
                  :theme="theme"
                  :width="device === 'mobile' ? '390px' : '100%'"
                  @error="(m) => (previewError = m)"
                  @rendered="previewError = ''"
                />
                <details class="rounded-[2rem] bg-white p-5 shadow-sm" open>
                  <summary class="cursor-pointer text-sm font-semibold">{{ $t('Try its fields') }}</summary>
                  <p class="mt-1 text-xs text-slate-500">
                    {{ $t('These values are only for the preview; pages get the defaults, and editors change them there.') }}
                  </p>
                  <div class="mt-4 space-y-4">
                    <FieldInput
                      v-for="field in ownFields"
                      :key="`${selected.id}-${field.key}`"
                      v-model="values[field.key]"
                      :field="field"
                    />
                  </div>
                </details>
              </template>

              <form v-else class="space-y-3 rounded-[2rem] bg-white p-5 shadow-sm" @submit.prevent="saveCode">
                <p class="text-xs text-slate-500">
                  {{ $t('Edit by hand if you like. Saving checks the code again; it stays a draft until approved.') }}
                </p>
                <label class="field-label" for="block-source">{{ $t('Component (Vue)') }}</label>
                <textarea id="block-source" v-model="editSource" class="input min-h-96 font-mono text-xs" dir="ltr" spellcheck="false" />
                <label class="field-label" for="block-def">{{ $t('Fields and defaults (JSON)') }}</label>
                <textarea id="block-def" v-model="editDef" class="input min-h-64 font-mono text-xs" dir="ltr" spellcheck="false" />
                <button type="submit" class="btn-dark" :disabled="busy">
                  <i class="mdi mdi-content-save-outline" /> {{ $t('Save draft') }}
                </button>
              </form>
            </div>

            <!-- The conversation with the AI: each request changes the draft. -->
            <aside class="flex max-h-[48rem] flex-col rounded-[2rem] bg-white p-4 shadow-sm">
              <h3 class="px-1 text-sm font-semibold">{{ $t('Ask for changes') }}</h3>
              <ol class="mt-3 flex-1 space-y-2 overflow-y-auto">
                <li
                  v-for="(m, i) in selected.conversation"
                  :key="i"
                  class="rounded-2xl px-3 py-2 text-sm"
                  :class="m.role === 'user' ? 'ms-6 bg-slate-100' : 'me-6 bg-[#00a998]/10'"
                >
                  <span class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {{ m.role === 'user' ? (m.author ?? $t('You')) : m.model ? `${$t('AI')} · ${m.model}` : $t('AI') }}
                  </span>
                  {{ m.text }}
                </li>
              </ol>
              <form class="mt-3" @submit.prevent="ask">
                <textarea
                  v-model="prompt"
                  class="input min-h-20 text-sm"
                  :placeholder="$t('E.g. make the cards rounder and add a subtitle')"
                  :aria-label="$t('Ask for changes')"
                  @keydown.enter.exact.prevent="ask"
                />
                <select
                  v-if="connections && connections.length > 1"
                  v-model="connectionId"
                  class="input mt-2 text-xs"
                  :aria-label="$t('AI model')"
                >
                  <option v-for="c in connections" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <button
                  type="submit"
                  class="btn-dark mt-2 w-full justify-center"
                  :disabled="busy || !ready || !isAdmin || prompt.trim().length < 3"
                >
                  <i class="mdi" :class="busy ? 'mdi-loading mdi-spin' : 'mdi-send'" /> {{ busy ? $t('Working…') : $t('Send') }}
                </button>
              </form>
            </aside>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
