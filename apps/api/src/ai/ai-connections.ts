import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Repository } from 'typeorm';
import { AuthGuard, type AuthUser, Roles } from '../auth/auth.guard';
import { currentSiteId } from '../sites/site-context';
import { AiConnection } from './ai-connection.entity';
import { decryptSecret, encryptSecret } from './crypto';
import { AI_PROVIDERS, AiError, type AiProvider, type AiProviderName, createProvider, SUGGESTED_MODELS } from './providers';

type Authed = { user: AuthUser };

const MAX_CONNECTIONS = 20;

class ConnectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsIn(AI_PROVIDERS)
  provider?: AiProviderName;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model?: string;

  /** Required when adding; when changing, left out or empty keeps the saved key. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  baseUrl?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  dailyLimit?: number;
}

const today = () => new Date().toISOString().slice(0, 10);
const usedToday = (c: AiConnection) => (c.usage?.day === today() ? (c.usage.count ?? 0) : 0);

/** What the admin sees of a connection: everything but the key. */
export function connectionView(c: AiConnection) {
  return {
    id: c.id,
    name: c.name,
    provider: c.provider,
    model: c.model,
    baseUrl: c.baseUrl,
    keyHint: c.keyHint,
    isDefault: c.isDefault,
    dailyLimit: c.dailyLimit,
    usedToday: usedToday(c),
  };
}

/** A connection's label in the builder's conversation, e.g. "Claude (claude-opus-5-5)". */
export const connectionLabel = (c: AiConnection) =>
  c.name && c.name.toLowerCase() !== c.model.toLowerCase() ? `${c.name} (${c.model})` : c.model;

@Injectable()
export class AiConnectionsService {
  constructor(@InjectRepository(AiConnection) private readonly repo: Repository<AiConnection>) {}

  /** The signed-in admin's own connections on the current site, the default first. */
  list(userId: string) {
    return this.repo.find({ where: { siteId: currentSiteId(), userId }, order: { isDefault: 'DESC', createdAt: 'ASC' } });
  }

  async get(userId: string, id: string) {
    const found = await this.repo.findOneBy({ id, siteId: currentSiteId(), userId });
    if (!found) throw new NotFoundException('AI model not found');
    return found;
  }

  private check(c: Partial<AiConnection>) {
    if (c.baseUrl && !/^https?:\/\/[^\s]+$/i.test(c.baseUrl))
      throw new BadRequestException('The base URL must start with http:// or https://');
    if (c.provider === 'openai-compatible' && !c.baseUrl) throw new BadRequestException('Enter the base URL of the AI service');
  }

  /** Makes `id` the default and every other connection of this admin on this site not. */
  private async setDefault(userId: string, id: string) {
    await this.repo.update({ siteId: currentSiteId(), userId }, { isDefault: false });
    await this.repo.update({ id }, { isDefault: true });
  }

  async create(userId: string, dto: ConnectionDto) {
    const siteId = currentSiteId();
    const existing = await this.repo.countBy({ siteId, userId });
    if (existing >= MAX_CONNECTIONS) throw new BadRequestException(`You can connect up to ${MAX_CONNECTIONS} AI models`);
    const key = dto.apiKey?.trim();
    if (!key) throw new BadRequestException('Enter the API key');
    if (!dto.model?.trim()) throw new BadRequestException('Enter the model name');
    const c = this.repo.create({
      siteId,
      userId,
      provider: dto.provider ?? 'anthropic',
      model: dto.model.trim(),
      name: dto.name?.trim() || dto.model.trim(),
      baseUrl: dto.baseUrl?.trim() ?? '',
      dailyLimit: dto.dailyLimit ?? 50,
      apiKeyEnc: encryptSecret(key),
      keyHint: key.length > 8 ? key.slice(-4) : '',
      isDefault: false,
    });
    this.check(c);
    const saved = await this.repo.save(c);
    // The first one is the default.
    if (dto.isDefault || existing === 0) await this.setDefault(userId, saved.id);
    return this.get(userId, saved.id);
  }

  async update(userId: string, id: string, dto: ConnectionDto) {
    const c = await this.get(userId, id);
    if (dto.provider !== undefined) c.provider = dto.provider;
    if (dto.model !== undefined) c.model = dto.model.trim();
    if (dto.name !== undefined) c.name = dto.name.trim() || c.model;
    if (dto.baseUrl !== undefined) c.baseUrl = dto.baseUrl.trim();
    if (dto.dailyLimit !== undefined) c.dailyLimit = dto.dailyLimit;
    const key = dto.apiKey?.trim();
    if (key) {
      c.apiKeyEnc = encryptSecret(key);
      c.keyHint = key.length > 8 ? key.slice(-4) : '';
    }
    this.check(c);
    await this.repo.save(c);
    if (dto.isDefault) await this.setDefault(userId, c.id);
    return this.get(userId, c.id);
  }

  async remove(userId: string, id: string) {
    const c = await this.get(userId, id);
    await this.repo.delete({ id: c.id });
    // Another one takes over as the default.
    if (c.isDefault) {
      const next = (await this.list(userId))[0];
      if (next) await this.setDefault(userId, next.id);
    }
  }

  /**
   * The model to use for a builder request: the one asked for, else the admin's default. Throws a message saying
   * what to do when there is none.
   */
  async pick(userId: string, id?: string): Promise<{ connection: AiConnection; provider: AiProvider }> {
    const connection = id ? await this.get(userId, id) : (await this.list(userId))[0];
    if (!connection) throw new BadRequestException('Connect an AI model first: add your provider, model and API key.');
    const apiKey = decryptSecret(connection.apiKeyEnc);
    if (!apiKey) throw new BadRequestException('The saved API key can no longer be read. Enter it again.');
    return {
      connection,
      provider: createProvider({ provider: connection.provider, model: connection.model, apiKey, baseUrl: connection.baseUrl }),
    };
  }

  /** Counts one request against the connection's daily limit, or refuses it when the limit is reached. */
  async useOne(connection: AiConnection) {
    const fresh = await this.repo.findOneByOrFail({ id: connection.id });
    const count = usedToday(fresh);
    if (count >= fresh.dailyLimit) {
      throw new HttpException(
        `Today's limit of ${fresh.dailyLimit} requests for this AI model is reached. Raise it, or try tomorrow.`,
        429,
      );
    }
    await this.repo.update({ id: fresh.id }, { usage: { day: today(), count: count + 1 } });
  }
}

/**
 * Each admin's own AI models for the block builder, on the current site. Keys are never sent back; an admin only ever
 * sees and uses their own connections.
 */
@Controller('admin/ai/connections')
@UseGuards(AuthGuard)
@Roles('admin')
export class AiConnectionsController {
  constructor(private readonly ai: AiConnectionsService) {}

  @Get()
  async list(@Req() req: Authed) {
    return {
      connections: (await this.ai.list(req.user.sub)).map(connectionView),
      providers: AI_PROVIDERS,
      suggestedModels: SUGGESTED_MODELS,
    };
  }

  @Post()
  async create(@Body() dto: ConnectionDto, @Req() req: Authed) {
    return connectionView(await this.ai.create(req.user.sub, dto));
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConnectionDto, @Req() req: Authed) {
    return connectionView(await this.ai.update(req.user.sub, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Authed) {
    await this.ai.remove(req.user.sub, id);
  }

  /** A tiny request with the saved settings, so the admin knows the key and model work before building anything. */
  @Post(':id/test')
  @HttpCode(200)
  async test(@Param('id', ParseUUIDPipe) id: string, @Req() req: Authed) {
    const { provider } = await this.ai.pick(req.user.sub, id);
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
