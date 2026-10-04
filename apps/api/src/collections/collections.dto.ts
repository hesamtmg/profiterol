import { locales } from '@profiterol/blocks';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidateNested,
} from 'class-validator';
import { SafeUrl } from '../common/safe-url';
import { SLUG_PATTERN } from '../common/slug';
import type { Localized } from '../settings/settings.entity';

const localeCodes = locales.map((l) => l.code);

export class CreateCollectionDto {
  @Matches(/^[a-z][a-z0-9-]{1,39}$/, { message: 'key must be lowercase letters, digits and dashes, e.g. projects' })
  key: string;

  @IsObject()
  name: Localized;

  /** Validated per locale in the service. */
  @IsObject()
  slugs: Localized;

  /** Validated with `validateFieldDefs` in the service. */
  @IsOptional()
  @IsArray()
  fields?: unknown[];
}

export class UpdateCollectionDto {
  @IsOptional()
  @IsObject()
  name?: Localized;

  @IsOptional()
  @IsObject()
  slugs?: Localized;

  @IsOptional()
  @IsArray()
  fields?: unknown[];
}

export class CreateItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;
}

export class ItemTranslationDto {
  @IsIn(localeCodes)
  locale: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(200)
  @Matches(SLUG_PATTERN, { message: 'slug may contain letters, digits, - and /' })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  excerpt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  /** Validated against the collection's fields in the service. */
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Validate(SafeUrl)
  cover?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemTranslationDto)
  translations?: ItemTranslationDto[];
}
