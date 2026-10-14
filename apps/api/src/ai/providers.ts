import Anthropic from '@anthropic-ai/sdk';
import type { AiPart } from './attachments';

export type AiProviderName = 'anthropic' | 'openai' | 'openai-compatible';
export const AI_PROVIDERS: AiProviderName[] = ['anthropic', 'openai', 'openai-compatible'];

/** Models offered in the settings form for each provider; any other model name can be typed in. */
export const SUGGESTED_MODELS: Record<AiProviderName, string[]> = {
  anthropic: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-1'],
  openai: [],
  'openai-compatible': [],
};

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
    const base = (this.opts.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
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
      ...(official ? { max_completion_tokens: req.maxTokens } : { max_tokens: req.maxTokens }),
    };
    let res: Response;
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.opts.apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new AiError('Could not reach the AI provider. Check the base URL and the server’s internet access.');
    }
    const data = (await res.json().catch(() => null)) as {
      error?: { message?: string };
      choices?: { message?: { content?: string; refusal?: string }; finish_reason?: string }[];
    } | null;
    if (!res.ok) {
      if (res.status === 401) throw new AiError('The AI provider refused the API key. Check it in your AI models.');
      if (res.status === 404) throw new AiError('The AI provider does not know this model (or the base URL is wrong).');
      if (res.status === 429) throw new AiError('The AI provider is rate limiting this key. Wait a minute and try again.');
      throw new AiError(`The AI provider answered with an error (${res.status})${data?.error?.message ? `: ${data.error.message}` : ''}`);
    }
    const choice = data?.choices?.[0];
    if (choice?.message?.refusal) throw new AiError('The AI declined this request. Try describing the block differently.');
    if (choice?.finish_reason === 'length') throw new AiError('The answer was cut off because it got too long. Ask for a simpler block.');
    return parseAnswer(choice?.message?.content ?? '');
  }
}

export function createProvider(opts: ProviderOptions): AiProvider {
  return opts.provider === 'anthropic' ? new AnthropicProvider(opts) : new OpenAiProvider(opts);
}
