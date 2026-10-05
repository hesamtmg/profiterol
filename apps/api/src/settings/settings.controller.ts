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
  cleanFonts,
  cleanLoader,
  cleanSavedThemes,
  cleanTheme,
  fontNames,
  mapRichText,
  validateBlocks,
} from '@profiterol/blocks';
import { randomBytes } from 'node:crypto';
import { cleanHtml } from '../common/rich-text';
import { Repository } from 'typeorm';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { SafeUrl } from '../common/safe-url';
import { Localized, SavedSection, SiteSettings } from './settings.entity';

const MAX_SECTIONS = 60;

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

  @IsOptional()
  @ValidateIf((o: UpdateSettingsDto) => o.notifyEmail !== '')
  @IsEmail()
  notifyEmail?: string;
}

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(SiteSettings) private readonly repo: Repository<SiteSettings>) {}

  async get(): Promise<SiteSettings> {
    return (await this.repo.findOneBy({ id: 1 })) ?? this.repo.save(this.repo.create({ id: 1 }));
  }

  async update(dto: Partial<SiteSettings>) {
    const current = await this.get();
    const next = { ...current, ...dto, id: 1 };
    // Fonts first: the themes may use the uploaded fonts' names.
    if (dto.fonts !== undefined) next.fonts = cleanFonts(dto.fonts);
    const custom = fontNames(next.fonts);
    if (dto.theme) next.theme = cleanTheme(dto.theme, custom);
    if (dto.savedThemes !== undefined) next.savedThemes = cleanSavedThemes(dto.savedThemes, custom);
    if (dto.loader !== undefined) next.loader = cleanLoader(dto.loader);
    return this.repo.save(next);
  }
}

@Controller()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public/settings')
  async get() {
    const { notifyEmail: _private, sections: _editorOnly, ...rest } = await this.settings.get();
    return rest;
  }

  @Get('admin/settings')
  @UseGuards(AuthGuard)
  @Roles('admin')
  getPrivate() {
    return this.settings.get();
  }

  @Put('admin/settings')
  @UseGuards(AuthGuard)
  @Roles('admin')
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto as Partial<SiteSettings>);
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
  ) {}

  @Get()
  async list() {
    return (await this.settings.get()).sections ?? [];
  }

  @Post()
  async save(@Body() dto: SaveSectionDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Give the section a name');
    const errors = validateBlocks([dto.block]);
    if (errors.length) throw new BadRequestException({ message: 'This block cannot be saved', errors: errors.slice(0, 10) });
    const { data: _data, ...block } = mapRichText([dto.block as unknown as BlockNode], cleanHtml)[0];
    const current = await this.settings.get();
    const sections = current.sections ?? [];
    if (sections.length >= MAX_SECTIONS) throw new BadRequestException(`You can keep up to ${MAX_SECTIONS} saved sections`);
    const section: SavedSection = { key: randomBytes(6).toString('hex'), name, block, createdAt: new Date().toISOString() };
    await this.repo.update(1, { sections: [section, ...sections] as never });
    return section;
  }

  @Delete(':key')
  @HttpCode(204)
  async remove(@Param('key') key: string) {
    const sections = (await this.settings.get()).sections ?? [];
    if (!sections.some((s) => s.key === key)) throw new NotFoundException();
    await this.repo.update(1, { sections: sections.filter((s) => s.key !== key) as never });
  }
}
