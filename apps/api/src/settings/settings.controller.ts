import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  type BlockNode,
  cleanBusiness,
  cleanFonts,
  cleanLoader,
  cleanSavedThemes,
  cleanSeo,
  cleanTheme,
  fontNames,
  locales,
  mapRichText,
  validateBlocks,
} from '@profiterol/blocks';
import { randomBytes } from 'node:crypto';
import { cleanHtml } from '../common/rich-text';
import { DataSource, Repository } from 'typeorm';
import { liveCustomDefs } from '../custom-blocks/live-defs';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { SafeUrl } from '../common/safe-url';
import { currentSite, currentSiteId, siteOrigin } from '../sites/site-context';
import { Localized, SavedSection, SiteSettings } from './settings.entity';

const MAX_SECTIONS = 60;
/** A site's default language for visitors: one of its languages, or '' to follow each visitor's browser. */
export const SITE_LOCALES = ['', ...locales.map((l) => l.code)];

class MenuItemDto {
  @IsObject()
  label: Localized;

  @IsString()
  @MaxLength(500)
  @Validate(SafeUrl)
  href: string;
}

class UpdateSettingsDto {
  @IsOptional()
  @IsObject()
  siteName?: Localized;

  @IsOptional()
  @IsString()
  @Validate(SafeUrl)
  logo?: string;

  @IsOptional()
  @IsString()
  @Validate(SafeUrl)
  favicon?: string;

  @IsOptional()
  @IsObject()
  theme?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  menu?: MenuItemDto[];

  @IsOptional()
  @IsArray()
  fonts?: unknown[];

  @IsOptional()
  @IsArray()
  savedThemes?: unknown[];

  @IsOptional()
  @IsObject()
  loader?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  maintenance?: boolean;

  @IsOptional()
  @IsObject()
  maintenanceText?: Localized;

  /** Checked and trimmed by cleanSeo. */
  @IsOptional()
  @IsObject()
  seo?: Record<string, unknown>;

  /** Checked and trimmed by cleanBusiness. */
  @IsOptional()
  @IsObject()
  business?: Record<string, unknown>;

  @IsOptional()
  @IsIn(SITE_LOCALES)
  defaultLocale?: string;

  @IsOptional()
  @ValidateIf((o: UpdateSettingsDto) => o.notifyEmail !== '')
  @IsEmail()
  notifyEmail?: string;
}

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(SiteSettings) private readonly repo: Repository<SiteSettings>) {}

  /** The current site's settings, made on first use. */
  async get(): Promise<SiteSettings> {
    const siteId = currentSiteId();
    const found = await this.repo.findOneBy({ siteId });
    if (found) return found;
    // Two first requests at once may both try to make the row; the second just reads it.
    await this.repo.createQueryBuilder().insert().values({ siteId }).orIgnore().execute();
    return this.repo.findOneByOrFail({ siteId });
  }

  /** The settings without what must never reach a browser (the AI key and its usage). */
  static withoutSecrets(settings: SiteSettings) {
    const { ai: _ai, ...rest } = settings;
    return rest;
  }

  async update(dto: Partial<SiteSettings>) {
    const current = await this.get();
    // The AI settings have their own route (AiSettingsService), which writes only that column.
    const { ai: _ai, ...base } = current;
    const next = { ...base, ...dto, siteId: current.siteId };
    // Fonts first: the themes may use the uploaded fonts' names.
    if (dto.fonts !== undefined) next.fonts = cleanFonts(dto.fonts);
    const custom = fontNames(next.fonts);
    if (dto.theme) next.theme = cleanTheme(dto.theme, custom);
    if (dto.savedThemes !== undefined) next.savedThemes = cleanSavedThemes(dto.savedThemes, custom);
    if (dto.loader !== undefined) next.loader = cleanLoader(dto.loader);
    if (dto.business !== undefined) next.business = cleanBusiness(dto.business);
    if (dto.seo !== undefined) next.seo = cleanSeo(dto.seo);
    return this.repo.save(next);
  }
}

@Controller()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** What the site renderer needs, plus the site's own address for canonical URLs, sitemaps and share links. */
  @Get('public/settings')
  async get() {
    const {
      notifyEmail: _private,
      sections: _editorOnly,
      siteId: _id,
      ...rest
    } = SettingsService.withoutSecrets(await this.settings.get());
    const site = currentSite();
    return { ...rest, origin: siteOrigin(site), domains: site.domains, adminLang: site.adminLang };
  }

  @Get('admin/settings')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async getPrivate() {
    return SettingsService.withoutSecrets(await this.settings.get());
  }

  @Put('admin/settings')
  @UseGuards(AuthGuard)
  @Roles('admin')
  async update(@Body() dto: UpdateSettingsDto) {
    return SettingsService.withoutSecrets(await this.settings.update(dto as Partial<SiteSettings>));
  }
}

class SaveSectionDto {
  @IsString()
  @MaxLength(80)
  name: string;

  /** Checked against the block registry in the controller. */
  @IsObject()
  block: Record<string, unknown>;
}

/** Saved sections: any signed-in editor can keep a block to reuse it on other pages. */
@Controller('admin/sections')
@UseGuards(AuthGuard)
export class SectionsController {
  constructor(
    private readonly settings: SettingsService,
    @InjectRepository(SiteSettings) private readonly repo: Repository<SiteSettings>,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async list() {
    return (await this.settings.get()).sections ?? [];
  }

  @Post()
  async save(@Body() dto: SaveSectionDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Give the section a name');
    const custom = await liveCustomDefs(this.dataSource);
    const errors = validateBlocks([dto.block], custom);
    if (errors.length) throw new BadRequestException({ message: 'This block cannot be saved', errors: errors.slice(0, 10) });
    const { data: _data, ...block } = mapRichText([dto.block as unknown as BlockNode], cleanHtml, custom)[0];
    const current = await this.settings.get();
    const sections = current.sections ?? [];
    if (sections.length >= MAX_SECTIONS) throw new BadRequestException(`You can keep up to ${MAX_SECTIONS} saved sections`);
    const section: SavedSection = { key: randomBytes(6).toString('hex'), name, block, createdAt: new Date().toISOString() };
    await this.repo.update({ siteId: currentSiteId() }, { sections: [section, ...sections] as never });
    return section;
  }

  @Delete(':key')
  @HttpCode(204)
  async remove(@Param('key') key: string) {
    const sections = (await this.settings.get()).sections ?? [];
    if (!sections.some((s) => s.key === key)) throw new NotFoundException();
    await this.repo.update({ siteId: currentSiteId() }, { sections: sections.filter((s) => s.key !== key) as never });
  }
}
