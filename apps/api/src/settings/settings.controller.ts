import { Body, Controller, Get, Injectable, Put, UseGuards } from '@nestjs/common';
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
import { cleanFonts, cleanLoader, cleanSavedThemes, cleanTheme, fontNames } from '@profiterol/blocks';
import { Repository } from 'typeorm';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { SafeUrl } from '../common/safe-url';
import { Localized, SiteSettings } from './settings.entity';

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
    const { notifyEmail: _private, ...rest } = await this.settings.get();
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
