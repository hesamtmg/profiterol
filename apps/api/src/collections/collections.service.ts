import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  cleanFieldDef,
  isLocale,
  locales,
  validateFieldDefs,
  validateFields,
  type FieldDef,
  type ValidationError,
} from '@profiterol/blocks';
import { QueryFailedError, Repository } from 'typeorm';
import { SEGMENT_PATTERN, slugify, UNIQUE_VIOLATION } from '../common/slug';
import type { Localized } from '../settings/settings.entity';
import { Collection, CollectionItem, ItemTranslation } from './collection.entity';
import { CreateCollectionDto, CreateItemDto, UpdateCollectionDto, UpdateItemDto } from './collections.dto';

/** A published item as shown on a card. */
export interface ItemCard {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover: string;
  tags: string[];
  publishedAt: Date | null;
  href: string;
}

function invalid(message: string, errors: ValidationError[]) {
  return new BadRequestException({ message, errors: errors.slice(0, 20) });
}

function isUniqueViolation(err: unknown) {
  return err instanceof QueryFailedError && (err as QueryFailedError & { code?: string }).code === UNIQUE_VIOLATION;
}

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection) private readonly collections: Repository<Collection>,
    @InjectRepository(CollectionItem) private readonly items: Repository<CollectionItem>,
    @InjectRepository(ItemTranslation) private readonly translations: Repository<ItemTranslation>,
  ) {}

  // ---------- Collections ----------

  listCollections() {
    return this.collections
      .createQueryBuilder('c')
      .loadRelationCountAndMap('c.itemCount', 'c.items')
      .orderBy('c.createdAt', 'ASC')
      .getMany();
  }

  async getCollection(id: string) {
    const c = await this.collections.findOneBy({ id });
    if (!c) throw new NotFoundException('Collection not found');
    return c;
  }

  async createCollection(dto: CreateCollectionDto) {
    if (await this.collections.existsBy({ key: dto.key })) throw new ConflictException(`A collection with key "${dto.key}" already exists`);
    const slugs = await this.checkSlugs(dto.slugs);
    const fields = this.checkFields(dto.fields ?? []);
    return this.collections.save(this.collections.create({ key: dto.key, name: this.localized(dto.name), slugs, fields }));
  }

  async updateCollection(id: string, dto: UpdateCollectionDto) {
    const c = await this.getCollection(id);
    if (dto.name) c.name = this.localized(dto.name);
    if (dto.slugs) c.slugs = await this.checkSlugs(dto.slugs, id);
    if (dto.fields) c.fields = this.checkFields(dto.fields);
    return this.collections.save(c);
  }

  async removeCollection(id: string) {
    await this.collections.remove(await this.getCollection(id));
  }

  /** Keeps only known locales, as trimmed strings. */
  private localized(input: Localized): Localized {
    return Object.fromEntries(
      locales.map((l) => [
        l.code,
        String(input?.[l.code] ?? '')
          .trim()
          .slice(0, 120),
      ]),
    );
  }

  /** Every locale needs a one-segment URL slug that no other collection uses in that locale. */
  private async checkSlugs(input: Localized, ownId?: string): Promise<Localized> {
    const slugs = this.localized(input);
    const errors: ValidationError[] = [];
    const others = (await this.collections.find()).filter((c) => c.id !== ownId);
    for (const l of locales) {
      const s = slugs[l.code];
      if (!SEGMENT_PATTERN.test(s)) errors.push({ path: `slugs.${l.code}`, message: 'must be one word or words joined by dashes' });
      else if (others.some((o) => o.slugs?.[l.code] === s))
        errors.push({ path: `slugs.${l.code}`, message: 'is used by another collection' });
    }
    if (errors.length) throw invalid('Invalid collection address', errors);
    return slugs;
  }

  private checkFields(input: unknown[]): FieldDef[] {
    const errors = validateFieldDefs(input);
    if (errors.length) throw invalid('Invalid fields', errors);
    return (input as FieldDef[]).map(cleanFieldDef);
  }

  // ---------- Items (admin) ----------

  async listItems(collectionId: string) {
    await this.getCollection(collectionId);
    return this.items.find({
      where: { collection: { id: collectionId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getItem(collectionId: string, id: string) {
    const item = await this.items.findOne({ where: { id, collection: { id: collectionId } } });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async createItem(collectionId: string, dto: CreateItemDto) {
    const c = await this.getCollection(collectionId);
    const translations = await Promise.all(
      locales.map(async (l) =>
        this.translations.create({
          collectionId: c.id,
          locale: l.code,
          title: dto.title,
          slug: await this.freeSlug(c.id, l.code, slugify(dto.title, 'item')),
          data: {},
          tags: [],
        }),
      ),
    );
    return this.items.save(this.items.create({ collection: c, translations }));
  }

  async updateItem(collectionId: string, id: string, dto: UpdateItemDto) {
    const c = await this.getCollection(collectionId);
    const item = await this.getItem(collectionId, id);
    if (dto.cover !== undefined) item.cover = dto.cover;

    for (const t of dto.translations ?? []) {
      // Drop values for fields that were removed from the collection, then validate the rest.
      const data = Object.fromEntries(Object.entries(t.data ?? {}).filter(([k]) => c.fields.some((f) => f.key === k)));
      const errors = validateFields(c.fields, data, `${t.locale}.data`);
      if (errors.length) throw invalid(`Invalid fields for "${t.locale}"`, errors);

      const values = {
        title: t.title,
        slug: t.slug,
        excerpt: t.excerpt ?? '',
        body: t.body ?? '',
        tags: [...new Set((t.tags ?? []).map((x) => x.trim()).filter(Boolean))],
        data,
        seoDescription: t.seoDescription ?? '',
      };
      const existing = item.translations.find((x) => x.locale === t.locale);
      if (existing) Object.assign(existing, values);
      else item.translations.push(this.translations.create({ ...values, locale: t.locale, collectionId: c.id }));
    }

    try {
      return await this.items.save(item);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('Another item in this collection already uses this address');
      throw err;
    }
  }

  async setStatus(collectionId: string, id: string, published: boolean) {
    const item = await this.getItem(collectionId, id);
    item.status = published ? 'published' : 'draft';
    if (published && !item.publishedAt) item.publishedAt = new Date();
    return this.items.save(item);
  }

  async removeItem(collectionId: string, id: string) {
    await this.items.remove(await this.getItem(collectionId, id));
  }

  private async freeSlug(collectionId: string, locale: string, base: string) {
    let slug = base;
    for (let n = 2; await this.translations.existsBy({ collectionId, locale, slug }); n++) slug = `${base}-${n}`;
    return slug;
  }

  // ---------- Public ----------

  private publicCollection(c: Collection, locale: string) {
    return {
      key: c.key,
      name: c.name?.[locale] || c.key,
      slug: c.slugs?.[locale] ?? '',
      href: `/${locale}/${c.slugs?.[locale] ?? ''}`,
      fields: c.fields,
      // A language without a URL segment for this collection has no index page.
      alternates: locales.filter((l) => c.slugs?.[l.code]).map((l) => ({ locale: l.code, slug: c.slugs[l.code] })),
    };
  }

  /** The collection whose URL segment is `slug` in this locale, for its automatic index page. */
  async findPublicCollection(locale: string, slug: string) {
    if (!isLocale(locale)) throw new NotFoundException();
    const c = await this.collections.createQueryBuilder('c').where(`c.slugs ->> :locale = :slug`, { locale, slug }).getOne();
    if (!c) throw new NotFoundException('Collection not found');
    return this.publicCollection(c, locale);
  }

  /** Published items of a collection as cards, newest first. */
  async listPublished(locale: string, key: string, opts: { limit?: number; tag?: string; excludeId?: string } = {}) {
    if (!isLocale(locale)) throw new NotFoundException();
    const c = await this.collections.findOneBy({ key });
    if (!c) return { collection: null, items: [] as ItemCard[], tags: [] as string[] };

    const qb = this.translations
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.item', 'i')
      .where('t.collectionId = :cid', { cid: c.id })
      .andWhere('t.locale = :locale', { locale })
      .andWhere(`i.status = 'published'`)
      .orderBy('i.publishedAt', 'DESC')
      .take(Math.min(Math.max(Math.trunc(opts.limit ?? 12), 1), 100));
    if (opts.tag) qb.andWhere('t.tags @> :tag::jsonb', { tag: JSON.stringify([opts.tag]) });
    if (opts.excludeId) qb.andWhere('i.id != :ex', { ex: opts.excludeId });

    const rows = await qb.getMany();
    const items: ItemCard[] = rows.map((t) => ({
      id: t.item.id,
      title: t.title,
      slug: t.slug,
      excerpt: t.excerpt,
      cover: t.item.cover,
      tags: t.tags,
      publishedAt: t.item.publishedAt,
      href: `/${locale}/${c.slugs?.[locale]}/${t.slug}`,
    }));
    return { collection: this.publicCollection(c, locale), items, tags: [...new Set(items.flatMap((i) => i.tags))] };
  }

  /** A published item's detail page. */
  async findPublishedItem(locale: string, collectionSlug: string, itemSlug: string) {
    const collection = await this.findPublicCollection(locale, collectionSlug);
    const c = await this.collections.findOneByOrFail({ key: collection.key });
    const t = await this.translations
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.item', 'i')
      .where('t.collectionId = :cid', { cid: c.id })
      .andWhere('t.locale = :locale', { locale })
      .andWhere('t.slug = :slug', { slug: itemSlug })
      .andWhere(`i.status = 'published'`)
      .getOne();
    if (!t) throw new NotFoundException('Item not found');

    const siblings = await this.translations.find({ where: { item: { id: t.item.id } }, select: { locale: true, slug: true } });
    const related = await this.listPublished(locale, c.key, { limit: 3, excludeId: t.item.id });

    return {
      collection,
      item: {
        id: t.item.id,
        title: t.title,
        slug: t.slug,
        excerpt: t.excerpt,
        body: t.body,
        tags: t.tags,
        data: t.data,
        cover: t.item.cover,
        seoDescription: t.seoDescription || t.excerpt,
        publishedAt: t.item.publishedAt,
        updatedAt: t.item.updatedAt,
      },
      alternates: siblings.filter((s) => c.slugs?.[s.locale]).map((s) => ({ locale: s.locale, path: `${c.slugs[s.locale]}/${s.slug}` })),
      related: related.items,
    };
  }

  /** Published items and collection index pages for the sitemap. */
  async sitemapEntries() {
    const all = await this.collections.find();
    const rows = await this.translations
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.item', 'i')
      .where(`i.status = 'published'`)
      .getMany();
    const byId = new Map(all.map((c) => [c.id, c]));
    const entries = rows
      .filter((t) => byId.get(t.collectionId)?.slugs?.[t.locale])
      .map((t) => ({ locale: t.locale, slug: `${byId.get(t.collectionId)!.slugs[t.locale]}/${t.slug}`, updatedAt: t.item.updatedAt }));
    for (const c of all) {
      for (const l of locales) if (c.slugs?.[l.code]) entries.push({ locale: l.code, slug: c.slugs[l.code], updatedAt: c.updatedAt });
    }
    return entries;
  }
}
