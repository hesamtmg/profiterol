import { BadRequestException, Body, Controller, Get, HttpCode, HttpException, Injectable, Post, Put, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, Validate } from 'class-validator';
import { Repository } from 'typeorm';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { currentSiteId } from '../sites/site-context';
import { SettingsService } from '../settings/settings.controller';
import { SiteSettings } from '../settings/settings.entity';
import { decryptSecret, encryptSecret } from './crypto';
import { AI_PROVIDERS, AiError, type AiProvider, type AiProviderName, createProvider, SUGGESTED_MODELS } from './providers';
import { SafeUrl } from '../common/safe-url';

/** A site's AI connection, as stored in site_settings.ai. */
export interface AiSettings {
  enabled: boolean;
  provider: AiProviderName;
  model: string;
  /** The API key, encrypted (see crypto.ts). */
  apiKeyEnc: string;
  /** The key's last 4 characters, so the admin can tell which key is saved. */
  keyHint: string;
  /** Only for OpenAI-compatible services (and an optional proxy in front of the others). */
  baseUrl: string;
  /** Builder requests allowed per day (UTC), to keep the bill predictable. */
  dailyLimit: number;
  usage: { day: string; count: number };
}

const DEFAULT_LIMIT = 50;

class UpdateAiSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn(AI_PROVIDERS)
  provider?: AiProviderName;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  /** A new key. Left out or empty: keep the saved one. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  /** true: forget the saved key. */
  @IsOptional()
  @IsBoolean()
  clearKey?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Validate(SafeUrl)
  baseUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  dailyLimit?: number;
}

const today = () => new Date().toISOString().slice(0, 10);

@Injectable()
export class AiSettingsService {
  constructor(
    private readonly settings: SettingsService,
    @InjectRepository(SiteSettings) private readonly repo: Repository<SiteSettings>,
  ) {}

  private async raw(): Promise<Partial<AiSettings>> {
    return (await this.settings.get()).ai ?? {};
  }

  /** What the settings form shows: everything but the key itself. */
  async view() {
    const ai = await this.raw();
    const provider = ai.provider ?? 'anthropic';
    return {
      enabled: ai.enabled ?? false,
      provider,
      model: ai.model ?? SUGGESTED_MODELS.anthropic[0],
      baseUrl: ai.baseUrl ?? '',
      dailyLimit: ai.dailyLimit ?? DEFAULT_LIMIT,
      hasKey: Boolean(ai.apiKeyEnc),
      keyHint: ai.apiKeyEnc ? (ai.keyHint ?? '') : '',
      usedToday: ai.usage?.day === today() ? ai.usage.count : 0,
      ready: Boolean(ai.enabled && ai.apiKeyEnc && ai.model),
      providers: AI_PROVIDERS,
      suggestedModels: SUGGESTED_MODELS,
    };
  }

  async update(dto: UpdateAiSettingsDto) {
    const ai: Partial<AiSettings> = { ...(await this.raw()) };
    if (dto.enabled !== undefined) ai.enabled = dto.enabled;
    if (dto.provider !== undefined) ai.provider = dto.provider;
    if (dto.model !== undefined) ai.model = dto.model.trim();
    if (dto.baseUrl !== undefined) {
      const url = dto.baseUrl.trim();
      if (url && !/^https?:\/\//i.test(url)) throw new BadRequestException('The base URL must start with http:// or https://');
      ai.baseUrl = url;
    }
    if (dto.dailyLimit !== undefined) ai.dailyLimit = dto.dailyLimit;
    if (dto.clearKey) {
      ai.apiKeyEnc = '';
      ai.keyHint = '';
    }
    const key = dto.apiKey?.trim();
    if (key) {
      ai.apiKeyEnc = encryptSecret(key);
      ai.keyHint = key.length > 8 ? key.slice(-4) : '';
    }
    await this.repo.update({ siteId: currentSiteId() }, { ai: ai as never });
    return this.view();
  }

  /** The provider as the admin set it up, or an error saying what is missing. */
  async provider(): Promise<AiProvider> {
    const ai = await this.raw();
    const apiKey = decryptSecret(ai.apiKeyEnc);
    if (!ai.enabled) throw new BadRequestException('The AI block builder is turned off. Turn it on in Settings → AI.');
    if (!apiKey) throw new BadRequestException('No AI API key is saved. Add one in Settings → AI.');
    if (!ai.model) throw new BadRequestException('Choose an AI model in Settings → AI.');
    if (ai.provider === 'openai-compatible' && !ai.baseUrl)
      throw new BadRequestException('Enter the base URL of the AI service in Settings → AI.');
    return createProvider({ provider: ai.provider ?? 'anthropic', model: ai.model, apiKey, baseUrl: ai.baseUrl });
  }

  /** Counts one builder request against today's limit, or refuses it when the limit is reached. */
  async useOne() {
    const ai = await this.raw();
    const limit = ai.dailyLimit ?? DEFAULT_LIMIT;
    const count = ai.usage?.day === today() ? ai.usage.count : 0;
    if (count >= limit) {
      throw new HttpException(`Today's limit of ${limit} AI requests is reached. Raise it in Settings → AI, or try tomorrow.`, 429);
    }
    // jsonb_set keeps the rest of the AI settings as they are, even if they changed since they were read.
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ ai: () => `jsonb_set(coalesce("ai", '{}'::jsonb), '{usage}', CAST(:usage AS jsonb))` })
      .setParameter('usage', JSON.stringify({ day: today(), count: count + 1 }))
      .where('"siteId" = :siteId', { siteId: currentSiteId() })
      .execute();
  }
}

@Controller('admin/settings/ai')
@UseGuards(AuthGuard)
@Roles('admin')
export class AiSettingsController {
  constructor(private readonly ai: AiSettingsService) {}

  @Get()
  get() {
    return this.ai.view();
  }

  @Put()
  update(@Body() dto: UpdateAiSettingsDto) {
    return this.ai.update(dto);
  }

  /** A tiny request with the saved settings, so the admin knows the key and model work before building anything. */
  @Post('test')
  @HttpCode(200)
  async test() {
    const provider = await this.ai.provider();
    try {
      await provider.generateJson({
        system: 'Answer with JSON only.',
        messages: [{ role: 'user', content: 'Reply with {"ok": "yes"}.' }],
        schema: { type: 'object', properties: { ok: { type: 'string' } }, required: ['ok'], additionalProperties: false },
        maxTokens: 2000,
      });
      return { ok: true };
    } catch (err) {
      if (err instanceof AiError) return { ok: false, message: err.message };
      throw err;
    }
  }
}
