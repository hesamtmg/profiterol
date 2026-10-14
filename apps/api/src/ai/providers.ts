import Anthropic from '@anthropic-ai/sdk';
import type { AiPart } from './attachments';

export type AiProviderName = 'anthropic' | 'openai' | 'openrouter' | 'gemini' | 'groq' | 'ollama' | 'openai-compatible';

/**
 * What the AI models form needs to know about each provider. Everything but Anthropic speaks OpenAI's Chat
 * Completions API, so the presets differ only in their address, whether a key is needed, and where to get one.
 */
export interface AiPreset {
  label: string;
  /** Used when the admin leaves the base URL empty ('' = they must enter one). */
  baseUrl: string;
  keyRequired: boolean;
  /** Where to get a key (shown in the form). */
  keyUrl: string;
  /** Has a free tier or runs for free; the form says so, with its limits. */
  free: boolean;
  /** A short note for the form. */
  note: string;
}

export const AI_PRESETS: Record<AiProviderName, AiPreset> = {
  anthropic: {
    label: 'Anthropic (Claude)',
    baseUrl: '',
    keyRequired: true,
    keyUrl: 'https://console.anthropic.com/settings/keys',
    free: false,
    note: '',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    keyRequired: true,
    keyUrl: 'https://platform.openai.com/api-keys',
    free: false,
    note: '',
  },
  openrouter: {
    label: 'OpenRouter (many models, some free)',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyRequired: true,
    keyUrl: 'https://openrouter.ai/keys',
    free: true,
    note: 'Models ending in ":free" cost nothing, with a daily request limit.',
  },
  gemini: {
    label: 'Google Gemini (free tier)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyRequired: true,
    keyUrl: 'https://aistudio.google.com/apikey',
    free: true,
    note: 'The free tier has daily limits, and Google may use free-tier requests to improve its products.',
  },
  groq: {
    label: 'Groq (free tier)',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyRequired: true,
    keyUrl: 'https://console.groq.com/keys',
    free: true,
    note: 'The free tier has per-minute and daily limits.',
  },
  ollama: {
    label: 'Ollama (your own server, free)',
    baseUrl: 'http://localhost:11434/v1',
    keyRequired: false,
    keyUrl: '',
    free: true,
    note: 'Runs models on your own machine. When Profiterol runs in Docker, use the Ollama container’s name (e.g. http://ollama:11434/v1) or http://host.docker.internal:11434/v1 as the base URL.',
  },
  'openai-compatible': {
    label: 'Other OpenAI-compatible service',
    baseUrl: '',
    keyRequired: false,
    keyUrl: '',
    free: false,
    note: 'Any service that speaks OpenAI’s Chat Completions API (LM Studio, vLLM, Together, …).',
  },
};

export const AI_PROVIDERS = Object.keys(AI_PRESETS) as AiProviderName[];

/** Models offered in the form before the provider's own list is loaded; any other model name can be typed in. */
export const SUGGESTED_MODELS: Partial<Record<AiProviderName, string[]>> = {
  anthropic: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-1'],
};

/** The address requests go to: the admin's own, else the provider's. */
export const baseUrlOf = (provider: AiProviderName, baseUrl?: string) => (baseUrl || AI_PRESETS[provider].baseUrl).replace(/\/+$/, '');

export interface AiMessage {
  role: 'user' | 'assistant';
  /** Text, or text with attached pictures and files. */
  content: string | AiPart[];
}

export interface AiRequest {
  system: string;
  messages: AiMessage[];
  /** JSON schema of the answer: an object whose properties are all required strings. */
  schema: { type: 'object'; properties: Record<string, unknown>; required: string[]; additionalProperties: false };
  maxTokens: number;
}

/** One AI service, set up with an admin's own key and model (see AiConnection). */
export interface AiProvider {
  /** Sends the conversation and returns the answer parsed as JSON. Throws AiError with a message fit for the admin. */
  generateJson(req: AiRequest): Promise<Record<string, unknown>>;
}

/** A failure explained in words the admin can act on (wrong key, unknown model, answer cut off…). */
export class AiError extends Error {}

export interface ProviderOptions {
  provider: AiProviderName;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

const TIMEOUT_MS = 10 * 60 * 1000;

function parseAnswer(text: string): Record<string, unknown> {
  // Some OpenAI-compatible servers wrap JSON in a code fence even when asked not to.
  const trimmed = text.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/, '$1');
  try {
    const value = JSON.parse(trimmed);
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch {
    // Reported below.
  }
  throw new AiError('The AI did not answer in the expected format. Try again, or pick a more capable model.');
}

class AnthropicProvider implements AiProvider {
  private readonly client: Anthropic;

  constructor(private readonly opts: ProviderOptions) {
    this.client = new Anthropic({ apiKey: opts.apiKey, baseURL: opts.baseUrl || undefined, timeout: TIMEOUT_MS, maxRetries: 1 });
  }

  async generateJson(req: AiRequest) {
    let message: Anthropic.Message;
    try {
      // Streamed, so a long answer (a whole component) never runs into an HTTP timeout.
      message = await this.client.messages
        .stream({
          model: this.opts.model,
          max_tokens: req.maxTokens,
          system: req.system,
          messages: req.messages.map((m) => ({ role: m.role, content: anthropicContent(m.content) })),
          output_config: { format: { type: 'json_schema', schema: req.schema } },
        })
        .finalMessage();
    } catch (err) {
      throw anthropicError(err);
    }
    if (message.stop_reason === 'refusal') throw new AiError('The AI declined this request. Try describing the block differently.');
    if (message.stop_reason === 'max_tokens') throw new AiError('The answer was cut off because it got too long. Ask for a simpler block.');
    const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    return parseAnswer(text);
  }
}

function anthropicContent(content: AiMessage['content']): string | Anthropic.ContentBlockParam[] {
  if (typeof content === 'string') return content;
  return content.map((p): Anthropic.ContentBlockParam => {
    if (p.type === 'image') return { type: 'image', source: { type: 'base64', media_type: p.mediaType, data: p.data } };
    if (p.type === 'pdf')
      return { type: 'document', title: p.name, source: { type: 'base64', media_type: 'application/pdf', data: p.data } };
    return { type: 'text', text: p.text };
  });
}

function anthropicError(err: unknown): AiError {
  if (err instanceof Anthropic.AuthenticationError) return new AiError('The AI provider refused the API key. Check it in your AI models.');
  if (err instanceof Anthropic.PermissionDeniedError) return new AiError('This API key may not use the chosen model.');
  if (err instanceof Anthropic.NotFoundError)
    return new AiError('The AI provider does not know this model. Check its name in your AI models.');
  if (err instanceof Anthropic.RateLimitError)
    return new AiError('The AI provider is rate limiting this key. Wait a minute and try again.');
  if (err instanceof Anthropic.BadRequestError) return new AiError(`The AI provider rejected the request: ${err.message}`);
  if (err instanceof Anthropic.APIConnectionError)
    return new AiError('Could not reach the AI provider. Check the server’s internet access.');
  if (err instanceof Anthropic.APIError) return new AiError(`The AI provider answered with an error (${err.status ?? 'no status'}).`);
  return new AiError('The AI request failed.');
}

function openAiContent(content: AiMessage['content']) {
  if (typeof content === 'string') return content;
  return content.map((p) => {
    if (p.type === 'image') return { type: 'image_url', image_url: { url: `data:${p.mediaType};base64,${p.data}` } };
    if (p.type === 'pdf') return { type: 'file', file: { filename: p.name, file_data: `data:application/pdf;base64,${p.data}` } };
    return { type: 'text', text: p.text };
  });
}

/** OpenAI's Chat Completions API, which many other services (OpenRouter, Ollama, LM Studio…) also speak. */
class OpenAiProvider implements AiProvider {
  constructor(private readonly opts: ProviderOptions) {}

  async generateJson(req: AiRequest) {
    const official = this.opts.provider === 'openai';
    const base = baseUrlOf(this.opts.provider, this.opts.baseUrl);
    const body = {
      model: this.opts.model,
      messages: [
        { role: 'system', content: req.system },
        ...req.messages.map((m) => ({ role: m.role, content: openAiContent(m.content) })),
      ],
      // Strict JSON schemas are an OpenAI feature; other servers usually only understand "some JSON object".
      response_format: official
        ? { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema: req.schema } }
        : { type: 'json_object' },
    };
    const send = async (maxTokens: number) => {
      const sized = { ...body, ...(official ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }) };
      let res: Response;
      try {
        res = await fetch(`${base}/chat/completions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeader(this.opts.apiKey) },
          body: JSON.stringify(sized),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        throw new AiError('Could not reach the AI provider. Check the base URL and the server’s internet access.');
      }
      const data = (await res.json().catch(() => null)) as {
        error?: { message?: string };
        choices?: { message?: { content?: string; refusal?: string }; finish_reason?: string }[];
      } | null;
      return { res, data };
    };
    let { res, data } = await send(req.maxTokens);
    // Some models allow shorter answers than asked for; the error says how long ("…supports at most 16384…"), so ask again within it.
    const allowed = res.status === 400 ? Number(/at most (\d+)/i.exec(data?.error?.message ?? '')?.[1]) : NaN;
    if (allowed > 0 && allowed < req.maxTokens) ({ res, data } = await send(allowed));
    if (!res.ok) {
      if (res.status === 401) throw new AiError('The AI provider refused the API key. Check it in your AI models.');
      if (res.status === 404) throw new AiError(await this.notFound(base, data?.error?.message));
      if (res.status === 429) throw new AiError('The AI provider is rate limiting this key. Wait a minute and try again.');
      throw new AiError(`The AI provider answered with an error (${res.status})${data?.error?.message ? `: ${data.error.message}` : ''}`);
    }
    const choice = data?.choices?.[0];
    if (choice?.message?.refusal) throw new AiError('The AI declined this request. Try describing the block differently.');
    if (choice?.finish_reason === 'length') throw new AiError('The answer was cut off because it got too long. Ask for a simpler block.');
    return parseAnswer(choice?.message?.content ?? '');
  }

  /**
   * Explains a 404. Usually the model name is wrong (OpenAI's are lowercase, e.g. "gpt-5"), so the key's own model
   * list is fetched to suggest the right ones; it only blames the address when even that list is missing.
   */
  private async notFound(base: string, providerMessage?: string): Promise<string> {
    const said = providerMessage ? ` The provider said: “${providerMessage}”` : '';
    let ids: string[] | null = null;
    try {
      const res = await fetch(`${base}/models`, {
        headers: authHeader(this.opts.apiKey),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) ids = (((await res.json()) as { data?: { id?: string }[] }).data ?? []).flatMap((m) => (m.id ? [m.id] : []));
    } catch {
      // Unreachable: reported below as a likely wrong address.
    }
    if (ids === null) {
      return this.opts.baseUrl
        ? `The AI service was not found at ${base}. Check the base URL (for OpenAI leave it empty).${said}`
        : `The AI provider does not know the model "${this.opts.model}".${said}`;
    }
    const wanted = this.opts.model.toLowerCase();
    const close = ids.filter((id) => id.toLowerCase() === wanted);
    if (close.length) return `Use the model name exactly as "${close[0]}" (names are case-sensitive).`;
    const chat = ids
      .filter((id) => this.opts.provider !== 'openai' || /^(gpt|o\d|chatgpt)/i.test(id))
      .sort()
      .reverse();
    const suggestions = (chat.length ? chat : ids).slice(0, 8).join(', ');
    return `This key cannot use a model called "${this.opts.model}".${said}${suggestions ? ` Models this key can use include: ${suggestions}.` : ''}`;
  }
}

/** Keyless local servers (Ollama) get no Authorization header at all. */
const authHeader = (key: string): Record<string, string> => (key ? { authorization: `Bearer ${key}` } : {});

export interface ListedModel {
  id: string;
  /** Costs nothing to use (OpenRouter's ":free" models, and everything on a local Ollama). */
  free: boolean;
}

/**
 * The models a key can use, straight from the provider, so admins pick a real name instead of guessing one. Text
 * models only where the provider says which are which.
 */
export async function listModels(opts: Omit<ProviderOptions, 'model'>): Promise<ListedModel[]> {
  if (opts.provider === 'anthropic') {
    const client = new Anthropic({ apiKey: opts.apiKey, baseURL: opts.baseUrl || undefined, timeout: 20_000, maxRetries: 1 });
    try {
      const out: ListedModel[] = [];
      for await (const m of client.models.list()) out.push({ id: m.id, free: false });
      return out;
    } catch (err) {
      throw anthropicError(err);
    }
  }
  const base = baseUrlOf(opts.provider, opts.baseUrl);
  if (!base) throw new AiError('Enter the base URL of the AI service.');
  let res: Response;
  try {
    res = await fetch(`${base}/models`, { headers: authHeader(opts.apiKey), signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new AiError(`Could not reach ${base}. Check the base URL, and that the server can reach it.`);
  }
  if (res.status === 401 || res.status === 403) throw new AiError('The AI provider refused the API key.');
  if (!res.ok) throw new AiError(`The AI provider did not list its models (${res.status}). Type the model name instead.`);
  const data = ((await res.json().catch(() => null)) ?? {}) as {
    data?: { id?: string; architecture?: { output_modalities?: string[] } }[];
  };
  const list = (data.data ?? []).flatMap((m) => {
    // Gemini lists "models/gemini-…"; requests use the bare name.
    const id = (m.id ?? '').replace(/^models\//, '');
    if (!id || /embed|whisper|tts|moderation|dall-e|image-|guard|safety|lyria/i.test(id)) return [];
    // Text in, text out only: music, picture and speech generators cannot write a block.
    const outputs = m.architecture?.output_modalities;
    if (outputs && (!outputs.includes('text') || outputs.some((o) => o !== 'text'))) return [];
    // OpenRouter's "openrouter/free" picks a different model for every request, so a block's changes would not hold.
    if (id === 'openrouter/free') return [];
    return [{ id, free: opts.provider === 'ollama' || id.endsWith(':free') }];
  });
  return list.sort((a, b) => Number(b.free) - Number(a.free) || a.id.localeCompare(b.id));
}

export function createProvider(opts: ProviderOptions): AiProvider {
  return opts.provider === 'anthropic' ? new AnthropicProvider(opts) : new OpenAiProvider(opts);
}
