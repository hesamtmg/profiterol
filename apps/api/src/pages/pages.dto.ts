import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, Matches, MaxLength, ValidateIf, ValidateNested } from 'class-validator';
import { locales } from '@profiterol/blocks';
import { SLUG_PATTERN } from '../common/slug';

const localeCodes = locales.map((l) => l.code);

export class TranslationDto {
  @IsIn(localeCodes)
  locale: string;

  @IsString()
  @MaxLength(200)
  title: string;

  /** Words joined by dashes or slashes; any script is allowed so Persian slugs work. */
  @IsString()
  @MaxLength(200)
  @Matches(SLUG_PATTERN, { message: 'slug may contain letters, digits, - and /' })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;

  /** Validated against the block registry in the service. */
  @IsArray()
  blocks: unknown[];
}

export class CreatePageDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsBoolean()
  isHome?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isHome?: boolean;

  /** The page's own theme (cleaned in the service), or null to use the site theme. */
  @ValidateIf((o: UpdatePageDto) => o.theme !== null && o.theme !== undefined)
  @IsObject()
  theme?: Record<string, unknown> | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}
