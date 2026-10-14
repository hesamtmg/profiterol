<script setup lang="ts">
/**
 * Settings → AI: which AI service the block builder uses. Saved on its own (not with "Save settings"), because the
 * API key is sent once and never comes back: the API keeps it encrypted and shows only its last characters.
 */
type Provider = 'anthropic' | 'openai' | 'openai-compatible';

interface AiView {
  enabled: boolean;
  provider: Provider;
  model: string;
  baseUrl: string;
  dailyLimit: number;
  hasKey: boolean;
  keyHint: string;
  usedToday: number;
  ready: boolean;
  providers: Provider[];
  suggestedModels: Record<Provider, string[]>;
}

const api = useApi();
const view = ref<AiView | null>(null);
const form = reactive({ enabled: false, provider: 'anthropic' as Provider, model: '', baseUrl: '', dailyLimit: 50, apiKey: '' });
const busy = ref(false);
const message = ref<{ kind: 'ok' | 'error'; text: string } | null>(null);

const providerLabels: Record<Provider, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  'openai-compatible': 'OpenAI-compatible (OpenRouter, Ollama, …)',
};

function fill(v: AiView) {
  view.value = v;
  Object.assign(form, {
    enabled: v.enabled,
    provider: v.provider,
    model: v.model,
    baseUrl: v.baseUrl,
    dailyLimit: v.dailyLimit,
    apiKey: '',
  });
}

async function load() {
  try {
    fill(await api<AiView>('/admin/settings/ai'));
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  }
}

async function save(extra: Record<string, unknown> = {}) {
  busy.value = true;
  message.value = null;
  try {
    const body = { ...form, ...extra, apiKey: form.apiKey.trim() || undefined };
    fill(await api<AiView>('/admin/settings/ai', { method: 'PUT', body }));
    message.value = { kind: 'ok', text: translate('AI settings saved.') };
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  } finally {
    busy.value = false;
  }
}

async function test() {
  busy.value = true;
  message.value = null;
  try {
    const res = await api<{ ok: boolean; message?: string }>('/admin/settings/ai/test', { method: 'POST' });
    message.value = res.ok
      ? { kind: 'ok', text: translate('The AI answered: the key and model work.') }
      : { kind: 'error', text: res.message ?? translate('The AI did not answer.') };
  } catch (err) {
    message.value = { kind: 'error', text: apiErrorMessage(err) };
  } finally {
    busy.value = false;
  }
}

const suggestions = computed(() => view.value?.suggestedModels[form.provider] ?? []);
onMounted(load);
</script>

<template>
  <section id="ai" class="rounded-[2rem] bg-white p-7 shadow-sm">
    <div class="flex items-center justify-between gap-3">
      <h2 class="font-black">{{ $t('AI') }}</h2>
      <span
        v-if="view"
        class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
        :class="view.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'"
      >
        {{ view.ready ? $t('Ready') : $t('Not set up') }}
      </span>
    </div>
    <p class="mt-1 text-xs text-slate-400">
      {{ $t('The AI service that builds custom blocks for the page editor. You pay the provider for what it uses.') }}
    </p>

    <form v-if="view" class="mt-5 space-y-4" @submit.prevent="save()">
      <label class="flex items-center gap-2 text-sm">
        <input v-model="form.enabled" type="checkbox" class="h-4 w-4 rounded" /> {{ $t('Let admins build blocks with AI') }}
      </label>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="field-label" for="ai-provider">{{ $t('Provider') }}</label>
          <select id="ai-provider" v-model="form.provider" class="input">
            <option v-for="p in view.providers" :key="p" :value="p">{{ $t(providerLabels[p]) }}</option>
          </select>
        </div>
        <div>
          <label class="field-label" for="ai-model">{{ $t('Model') }}</label>
          <input id="ai-model" v-model="form.model" class="input" dir="ltr" list="ai-models" placeholder="claude-opus-5-5" required />
          <datalist id="ai-models">
            <option v-for="m in suggestions" :key="m" :value="m" />
          </datalist>
        </div>
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
          :placeholder="
            view.hasKey
              ? $t('Saved (…{hint}). Type a new key to replace it.', { hint: view.keyHint || '••••' })
              : $t('Paste the key from your provider')
          "
        />
        <p class="mt-1 text-xs text-slate-400">{{ $t('Stored encrypted. It is never shown again, here or anywhere else.') }}</p>
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
      <div class="max-w-xs">
        <label class="field-label" for="ai-limit">{{ $t('Requests per day') }}</label>
        <input id="ai-limit" v-model.number="form.dailyLimit" type="number" min="1" max="1000" class="input" />
        <p class="mt-1 text-xs text-slate-400">{{ $t('Used today: {n}', { n: view.usedToday }) }}</p>
      </div>
      <p
        v-if="message"
        class="whitespace-pre-line rounded-2xl px-4 py-3 text-sm"
        :class="message.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'"
        role="status"
      >
        {{ message.text }}
      </p>
      <div class="flex flex-wrap gap-2">
        <button type="submit" class="btn-dark" :disabled="busy">{{ $t('Save AI settings') }}</button>
        <button type="button" class="btn-light" :disabled="busy || !view.hasKey" @click="test">{{ $t('Test connection') }}</button>
        <button v-if="view.hasKey" type="button" class="btn-light hover:!text-red-600" :disabled="busy" @click="save({ clearKey: true })">
          {{ $t('Remove key') }}
        </button>
        <NuxtLink to="/admin/blocks" class="btn-light ms-auto"><i class="mdi mdi-creation" /> {{ $t('Open the block builder') }}</NuxtLink>
      </div>
    </form>
  </section>
</template>
