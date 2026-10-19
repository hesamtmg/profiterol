import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Validate,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { locales, MAX_CUSTOM_CSS, pageTemplates } from '@profiterol/blocks';
import { SafeUrl } from '../common/safe-url';
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

  /** Picture for link previews: an upload or an https address. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Validate(SafeUrl)
  ogImage?: string;

  /** Validated against the block registry in the service. */
  @IsArray()
  blocks: unknown[];
}

export class CreatePageDto {
  @IsString()
  @MaxLength(120)
  name: string;

  /** Start from a page template (its blocks in every language). */
  @IsOptional()
  @IsIn(pageTemplates.map((p) => p.key))
  template?: string;

  @IsOptional()
  @IsBoolean()
  isHome?: boolean;

  /** Keep this page out of search engines. */
  @IsOptional()
  @IsBoolean()
  noindex?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

/** Copies of blocks from another page, added to this page's draft in one language. */
export class AddBlocksDto {
  @IsIn(localeCodes)
  locale: string;

  /** Validated against the block registry in the service. */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  blocks: unknown[];

  /** Before the page's blocks or after them (the default). */
  @IsOptional()
  @IsIn(['start', 'end'])
  position?: 'start' | 'end';
}

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isHome?: boolean;

  /** Keep this page out of search engines. */
  @IsOptional()
  @IsBoolean()
  noindex?: boolean;

  /** Publish the draft at this time (ISO date), or null to cancel. */
  @ValidateIf((o: UpdatePageDto) => o.publishAt !== null && o.publishAt !== undefined)
  @IsDateString()
  publishAt?: string | null;

  /** Take the page offline at this time (ISO date), or null to cancel. */
  @ValidateIf((o: UpdatePageDto) => o.unpublishAt !== null && o.unpublishAt !== undefined)
  @IsDateString()
  unpublishAt?: string | null;

  /** The page's own theme (cleaned in the service), or null to use the site theme. */
  @ValidateIf((o: UpdatePageDto) => o.theme !== null && o.theme !== undefined)
  @IsObject()
  theme?: Record<string, unknown> | null;

  /** CSS for this page only (cleaned in the service); it goes live when the page is published. */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_CUSTOM_CSS)
  customCss?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}
