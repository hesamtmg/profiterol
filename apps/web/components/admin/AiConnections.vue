<script setup lang="ts">
/**
 * "Your AI models" in the block builder: the signed-in admin's own AI connections on this site. Each has its own
 * provider, model, API key and daily limit; other admins never see or use them. Keys are sent once and never come
 * back: the API keeps them encrypted and shows only their last characters.
 */
export type AiProvider = 'anthropic' | 'openai' | 'openai-compatible';

export interface AiConnectionView {
  id: string;
  name: string;
  provider: AiProvider;
  model: string;
  baseUrl: string;
  keyHint: string;
  isDefault: boolean;
  dailyLimit: number;
  usedToday: number;
}

const emit = defineEmits<{ change: [list: AiConnectionView[]] }>();

const api = useApi();
const list = ref<AiConnectionView[]>([]);
const providers = ref<AiProvider[]>(['anthropic', 'openai', 'openai-compatible']);
const suggested = ref<Record<AiProvider, string[]>>({ anthropic: [], openai: [], 'openai-compatible': [] });
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
  isDefault: false,
});
const form = reactive(empty());
const editing = ref(false);

const providerLabels: Record<AiProvider, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  'openai-compatible': 'OpenAI-compatible (OpenRouter, Ollama, …)',
};

async function load() {
  try {
    const res = await api<{ connections: AiConnectionView[]; providers: AiProvider[]; suggestedModels: Record<AiProvider, string[]> }>(
      '/admin/ai/connections',
    );
    list.value = res.connections;
    providers.value = res.providers;
    suggested.value = res.suggestedModels;
    emit('change', list.value);
    // Nothing connected yet: open the form straight away.
    if (!list.value.length) startAdd();
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  }
}

function startAdd() {
  Object.assign(form, empty(), { model: suggested.value.anthropic[0] ?? '' });
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
    const res = await api<{ ok: boolean; message?: string }>(`/admin/ai/connections/${c.id}/test`, { method: 'POST' });
    message.value = res.ok
      ? { kind: 'ok', text: translate('{name} answered: the key and model work.', { name: c.name }) }
      : { kind: 'error', text: res.message ?? translate('The AI did not answer.') };
  });
}

const suggestions = computed(() => suggested.value[form.provider] ?? []);
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
            {{ $t(providerLabels[c.provider]) }} · {{ c.model }}{{ c.keyHint ? ` · …${c.keyHint}` : '' }}
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
            <option v-for="p in providers" :key="p" :value="p">{{ $t(providerLabels[p]) }}</option>
          </select>
        </div>
        <div>
          <label class="field-label" for="ai-model">{{ $t('Model') }}</label>
          <input id="ai-model" v-model="form.model" class="input" dir="ltr" list="ai-models" placeholder="claude-opus-5-5" required />
          <datalist id="ai-models">
            <option v-for="m in suggestions" :key="m" :value="m" />
          </datalist>
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
            :required="!form.id"
            :placeholder="form.id ? $t('Saved. Type a new key to replace it.') : $t('Paste the key from your provider')"
          />
        </div>
        <div v-if="form.provider !== 'anthropic' || form.baseUrl">
          <label class="field-label" for="ai-base">{{ $t('Base URL') }}</label>
          <input
            id="ai-base"
            v-model="form.baseUrl"
            class="input"
            dir="ltr"
            :placeholder="form.provider === 'openai' ? 'https://api.openai.com/v1' : 'https://openrouter.ai/api/v1'"
            :required="form.provider === 'openai-compatible'"
          />
        </div>
        <div>
          <label class="field-label" for="ai-limit">{{ $t('Requests per day') }}</label>
          <input id="ai-limit" v-model.number="form.dailyLimit" type="number" min="1" max="1000" class="input" />
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
