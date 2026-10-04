import { Body, Controller, Get, Injectable, Put, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isSafeUrl } from '@profiterol/blocks';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Repository } from 'typeorm';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { Localized, SiteSettings } from './settings.entity';

@ValidatorConstraint({ name: 'safeUrl' })
class SafeUrl implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && isSafeUrl(value);
  }
  defaultMessage() {
    return 'must be a relative path or an http(s), mailto or tel link';
  }
}

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
  @IsBoolean()
  maintenance?: boolean;

  @IsOptional()
  @IsObject()
  maintenanceText?: Localized;
}

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(SiteSettings) private readonly repo: Repository<SiteSettings>) {}

  async get(): Promise<SiteSettings> {
    return (await this.repo.findOneBy({ id: 1 })) ?? this.repo.save(this.repo.create({ id: 1 }));
  }

  async update(dto: Partial<SiteSettings>) {
    const current = await this.get();
    return this.repo.save({ ...current, ...dto, id: 1 });
  }
}

@Controller()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public/settings')
  get() {
    return this.settings.get();
  }

  @Put('admin/settings')
  @UseGuards(AuthGuard)
  @Roles('admin')
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto as Partial<SiteSettings>);
  }
}
