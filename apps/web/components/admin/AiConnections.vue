<script setup lang="ts">
/**
 * "Your AI models" in the block builder: the signed-in admin's own AI connections on this site. Each has its own
 * provider, model, API key, daily limit and timeout; other admins never see or use them. Keys are sent once and never come
 * back: the API keeps them encrypted and shows only their last characters.
 */
export type AiProvider = 'anthropic' | 'openai' | 'openrouter' | 'gemini' | 'groq' | 'gapgpt' | 'ollama' | 'openai-compatible';

/** What the API says about each provider (apps/api/src/ai/providers.ts AI_PRESETS). */
interface AiPreset {
  label: string;
  baseUrl: string;
  keyRequired: boolean;
  keyUrl: string;
  free: boolean;
  note: string;
}

export interface AiConnectionView {
  id: string;
  name: string;
  provider: AiProvider;
  model: string;
  baseUrl: string;
  keyHint: string;
  isDefault: boolean;
  dailyLimit: number;
  timeoutSeconds: number;
  usedToday: number;
}

const emit = defineEmits<{ change: [list: AiConnectionView[]] }>();

const api = useApi();
const list = ref<AiConnectionView[]>([]);
const providers = ref<AiProvider[]>([]);
const presets = ref<Partial<Record<AiProvider, AiPreset>>>({});
const suggested = ref<Partial<Record<AiProvider, string[]>>>({});
const preset = computed(() => presets.value[form.provider]);
const busy = ref(false);
const message = ref<{ kind: 'ok' | 'error'; text: string } | null>(null);

/** The add / edit form; `id` is set when editing. */
const empty = () => ({
  id: '',
  name: '',
  provider: 'anthropic' as AiProvider,
  model: '',
  apiKey: '',
  baseUrl: '',
  dailyLimit: 50,
  timeoutSeconds: 600,
  isDefault: false,
});
const form = reactive(empty());
const editing = ref(false);

const providerLabel = (p: AiProvider) => presets.value[p]?.label ?? p;

/** The provider's own model list, from "Load models". */
const loaded = ref<{ provider: AiProvider; models: { id: string; free: boolean }[] } | null>(null);
const freeOnly = ref(false);
const loadedModels = computed(() => (loaded.value?.provider === form.provider ? loaded.value.models : null));
const hasFree = computed(() => Boolean(loadedModels.value?.some((m) => m.free)));

async function loadModels() {
  await run(async () => {
    const res = await api<{ models: { id: string; free: boolean }[] }>('/admin/ai/connections/models', {
      method: 'POST',
      body: {
        provider: form.provider,
        apiKey: form.apiKey || undefined,
        baseUrl: form.baseUrl || undefined,
        connectionId: form.id || undefined,
      },
    });
    loaded.value = { provider: form.provider, models: res.models };
    freeOnly.value = res.models.some((m) => m.free) && presets.value[form.provider]?.free === true && form.provider !== 'ollama';
    message.value = {
      kind: res.models.length ? 'ok' : 'error',
      text: res.models.length
        ? translate('{n} models found. Pick one in the Model field.', { n: res.models.length })
        : translate('The provider listed no models. Type the model name instead.'),
    };
  });
}

// Another provider: its models, not the last one's.
watch(
  () => form.provider,
  (p, old) => {
    if (!editing.value || !old || form.id) return;
    form.model = suggested.value[p]?.[0] ?? '';
  },
);

async function load() {
  try {
    const res = await api<{
      connections: AiConnectionView[];
      providers: AiProvider[];
      presets: Record<AiProvider, AiPreset>;
      suggestedModels: Partial<Record<AiProvider, string[]>>;
    }>('/admin/ai/connections');
    list.value = res.connections;
    providers.value = res.providers;
    presets.value = res.presets;
    suggested.value = res.suggestedModels;
    emit('change', list.value);
    // Nothing connected yet: open the form straight away.
    if (!list.value.length) startAdd();
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  }
}

function startAdd() {
  Object.assign(form, empty(), { model: suggested.value.anthropic?.[0] ?? '' });
  editing.value = true;
  message.value = null;
}

function startEdit(c: AiConnectionView) {
  Object.assign(form, { ...c, apiKey: '' });
  editing.value = true;
  message.value = null;
}

async function run(work: () => Promise<void>, ok?: string) {
  busy.value = true;
  message.value = null;
  try {
    await work();
    if (ok) message.value = { kind: 'ok', text: translate(ok) };
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  } finally {
    busy.value = false;
  }
}

const save = () =>
  run(async () => {
    const { id, apiKey, ...rest } = form;
    const body = { ...rest, apiKey: apiKey.trim() || undefined };
    if (id) await api(`/admin/ai/connections/${id}`, { method: 'PUT', body });
    else await api('/admin/ai/connections', { method: 'POST', body });
    editing.value = false;
    await load();
  }, 'AI model saved.');

const makeDefault = (c: AiConnectionView) =>
  run(async () => {
    await api(`/admin/ai/connections/${c.id}`, { method: 'PUT', body: { isDefault: true } });
    await load();
  });

const remove = (c: AiConnectionView) =>
  run(async () => {
    if (!confirm(translate('Remove “{name}” and its API key?', { name: c.name }))) return;
    await api(`/admin/ai/connections/${c.id}`, { method: 'DELETE' });
    await load();
  });

async function test(c: AiConnectionView) {
  await run(async () => {
    // A slow provider (or one far away) can take longer than the usual 20 seconds even for this tiny request.
    const res = await api<{ ok: boolean; message?: string }>(`/admin/ai/connections/${c.id}/test`, { method: 'POST', timeout: 60_000 });
    message.value = res.ok
      ? { kind: 'ok', text: translate('{name} answered: the key and model work.', { name: c.name }) }
      : { kind: 'error', text: res.message ?? translate('The AI did not answer.') };
  });
}

const suggestions = computed(() =>
  loadedModels.value
    ? loadedModels.value.filter((m) => !freeOnly.value || m.free).map((m) => m.id)
    : (suggested.value[form.provider] ?? []),
);
defineExpose({ load });
onMounted(load);
</script>

<template>
  <section class="rounded-[2rem] bg-white p-6 shadow-sm" data-testid="ai-connections">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="font-bold">{{ $t('Your AI models') }}</h2>
        <p class="text-xs text-slate-400">
          {{ $t('Only you can see and use these, and only on this site. Add any model your provider offers.') }}
        </p>
      </div>
      <button v-if="!editing" type="button" class="btn-light" @click="startAdd"><i class="mdi mdi-plus" /> {{ $t('Add a model') }}</button>
    </div>

    <ul v-if="list.length" class="mt-4 divide-y divide-slate-100">
      <li v-for="c in list" :key="c.id" class="flex flex-wrap items-center gap-3 py-3 text-sm" :data-connection="c.name">
        <i class="mdi text-xl" :class="c.isDefault ? 'mdi-star text-amber-500' : 'mdi-star-outline text-slate-300'" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium">{{ c.name }}</p>
          <p class="truncate text-xs text-slate-500" dir="ltr">
            {{ $t(providerLabel(c.provider)) }} · {{ c.model }}{{ c.keyHint ? ` · …${c.keyHint}` : '' }}
          </p>
        </div>
        <span class="text-xs text-slate-400">{{ $t('{used} of {limit} today', { used: c.usedToday, limit: c.dailyLimit }) }}</span>
        <button v-if="!c.isDefault" type="button" class="btn-pill text-xs" :disabled="busy" @click="makeDefault(c)">
          {{ $t('Make default') }}
        </button>
        <button type="button" class="btn-pill text-xs" :disabled="busy" @click="test(c)">{{ $t('Test') }}</button>
        <button type="button" class="btn-icon" :title="$t('Edit')" :disabled="busy" @click="startEdit(c)">
          <i class="mdi mdi-pencil-outline" />
        </button>
        <button type="button" class="btn-icon hover:!text-red-600" :title="$t('Remove')" :disabled="busy" @click="remove(c)">
          <i class="mdi mdi-trash-can-outline" />
        </button>
      </li>
    </ul>

    <form v-if="editing" class="mt-4 space-y-4 rounded-2xl bg-slate-50 p-4" @submit.prevent="save">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="field-label" for="ai-provider">{{ $t('Provider') }}</label>
          <select id="ai-provider" v-model="form.provider" class="input">
            <option v-for="p in providers" :key="p" :value="p">{{ $t(providerLabel(p)) }}</option>
          </select>
          <p v-if="preset?.note" class="mt-1 text-xs text-slate-500">{{ $t(preset.note) }}</p>
          <p v-if="preset?.keyUrl" class="mt-1 text-xs text-slate-400">
            {{ $t('Get a key at') }}
            <a :href="preset.keyUrl" target="_blank" rel="noopener noreferrer" class="text-[#00a998] underline" dir="ltr">{{
              preset.keyUrl.replace(/^https:\/\//, '')
            }}</a>
          </p>
        </div>
        <div>
          <label class="field-label" for="ai-model">{{ $t('Model') }}</label>
          <div class="flex gap-2">
            <input id="ai-model" v-model="form.model" class="input" dir="ltr" list="ai-models" required />
            <button
              type="button"
              class="btn-pill shrink-0 text-xs"
              :disabled="busy || (preset?.keyRequired && !form.apiKey && !form.id)"
              :title="$t('Ask the provider which models your key can use')"
              @click="loadModels"
            >
              <i class="mdi mdi-download-outline" /> {{ $t('Load models') }}
            </button>
          </div>
          <datalist id="ai-models">
            <option v-for="m in suggestions" :key="m" :value="m" />
          </datalist>
          <label v-if="hasFree" class="mt-1 flex items-center gap-1.5 text-xs">
            <input v-model="freeOnly" type="checkbox" class="h-3.5 w-3.5 rounded" /> {{ $t('Free models only') }}
          </label>
          <p class="mt-1 text-xs text-slate-400">
            {{ $t('Exactly as your provider writes it (OpenAI names are lowercase, e.g. gpt-5).') }}
          </p>
        </div>
        <div>
          <label class="field-label" for="ai-name">{{ $t('Name (optional)') }}</label>
          <input
            id="ai-name"
            v-model="form.name"
            class="input"
            :placeholder="form.model || $t('E.g. Claude, work account')"
            maxlength="80"
          />
        </div>
        <div>
          <label class="field-label" for="ai-key">{{ $t('API key') }}</label>
          <input
            id="ai-key"
            v-model="form.apiKey"
            type="password"
            class="input"
            dir="ltr"
            autocomplete="off"
            :required="!form.id && preset?.keyRequired !== false"
            :placeholder="
              form.id
                ? $t('Saved. Type a new key to replace it.')
                : preset?.keyRequired === false
                  ? $t('Not needed for this provider')
                  : $t('Paste the key from your provider')
            "
          />
        </div>
        <div v-if="form.provider !== 'anthropic' || form.baseUrl">
          <label class="field-label" for="ai-base">{{ $t('Base URL') }}</label>
          <input
            id="ai-base"
            v-model="form.baseUrl"
            class="input"
            dir="ltr"
            :placeholder="preset?.baseUrl || 'https://example.com/v1'"
            :required="!preset?.baseUrl"
          />
          <p v-if="preset?.baseUrl" class="mt-1 text-xs text-slate-400" dir="auto">
            {{ $t('Leave empty to use {url}.', { url: preset.baseUrl }) }}
          </p>
        </div>
        <div>
          <label class="field-label" for="ai-limit">{{ $t('Requests per day') }}</label>
          <input id="ai-limit" v-model.number="form.dailyLimit" type="number" min="1" max="1000" class="input" />
        </div>
        <div>
          <label class="field-label" for="ai-timeout">{{ $t('Timeout (seconds)') }}</label>
          <input id="ai-timeout" v-model.number="form.timeoutSeconds" type="number" min="30" max="3600" class="input" />
          <p class="mt-1 text-xs text-slate-400">{{ $t('How long to wait for each answer. Give slow or far-away services more.') }}</p>
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="form.isDefault" type="checkbox" class="h-4 w-4 rounded" /> {{ $t('Use this model by default') }}
      </label>
      <p class="text-xs text-slate-400">{{ $t('The key is stored encrypted. It is never shown again, here or anywhere else.') }}</p>
      <div class="flex gap-2">
        <button type="submit" class="btn-dark" :disabled="busy">{{ $t('Save model') }}</button>
        <button v-if="list.length" type="button" class="btn-light" :disabled="busy" @click="editing = false">{{ $t('Cancel') }}</button>
      </div>
    </form>

    <p
      v-if="message"
      class="mt-4 whitespace-pre-line rounded-2xl px-4 py-3 text-sm"
      :class="message.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'"
      role="status"
    >
      {{ message.text }}
    </p>
  </section>
</template>
