import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { SITE_LOCALES } from '../settings/settings.controller';
import { ADMIN_LANGS, type AdminLang } from './site.entity';

/** A new preview, by the owner (Admin → Sites) or by a site's admins (Admin → Preview sites); and changes to one. */
export class CreatePreviewDto {
  /** Shown in the owner's list and as the site's name. */
  @IsString()
  @MaxLength(120)
  name: string;

  /** Its address: <PREVIEW_URL>/preview/<slug>. */
  @IsString()
  @MaxLength(40)
  slug: string;

  /** 'demo' (the demo pages and collections), 'blank', or a whole-site template's key. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  template?: string;

  /** How long it stays online. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;

  /** Who it is for and notes; only the owner sees them. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  prospect?: string;

  /** Invited as the preview's admin. */
  @IsOptional()
  @ValidateIf((o: CreatePreviewDto) => !!o.adminEmail)
  @IsEmail()
  adminEmail?: string;

  @IsOptional()
  @IsIn(ADMIN_LANGS)
  adminLang?: AdminLang;

  @IsOptional()
  @IsIn(SITE_LOCALES)
  defaultLocale?: string;

  /** Allow the sublimation (textile) designer block and Print orders on the preview. Owners only. */
  @IsOptional()
  @IsBoolean()
  printDesigner?: boolean;
}

export class UpdatePreviewDto {
  /** A new end date; one in the past ends the preview now. */
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  /** Days added to its end (or to today, once it has ended). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  extendDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  prospect?: string;
}

/** Someone gets the preview's admin panel: an account and a link to choose its password. */
export class InvitePreviewDto {
  @IsEmail()
  email: string;
}

/** A site's admin asks the owners to move a bought preview to the customer's address ('' withdraws it). */
export class ConvertRequestDto {
  @IsString()
  @MaxLength(253)
  domain: string;
}
