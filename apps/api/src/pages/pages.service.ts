import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BlockNode, cleanTheme, fontNames, formBlockTypes, isLocale, locales, mapRichText, validateBlocks } from '@profiterol/blocks';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import { CollectionsService } from '../collections/collections.service';
import { SettingsService } from '../settings/settings.controller';
import { cleanHtml } from '../common/rich-text';
import { slugify, UNIQUE_VIOLATION } from '../common/slug';
import { CreatePageDto, TranslationDto, UpdatePageDto } from './pages.dto';
import { Page, PageTranslation } from './page.entity';

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page) private readonly pages: Repository<Page>,
    @InjectRepository(PageTranslation) private readonly translations: Repository<PageTranslation>,
    private readonly dataSource: DataSource,
    private readonly collections: CollectionsService,
    private readonly settings: SettingsService,
  ) {}

  list() {
    return this.pages.find({ order: { isHome: 'DESC', updatedAt: 'DESC' } });
  }

  async get(id: string) {
    const page = await this.pages.findOneBy({ id });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async create(dto: CreatePageDto) {
    const given = dto.translations ?? [];
    // Every page gets one translation per locale so the editor can switch languages straight away.
    const translations = await Promise.all(
      locales.map(async (l) => {
        const t = given.find((g) => g.locale === l.code);
        return t ?? { locale: l.code, title: dto.name, slug: await this.freeSlug(l.code, slugify(dto.name)), blocks: [] };
      }),
    );
    translations.forEach((t) => this.assertBlocks(t.blocks, t.locale));

    return this.save(async (manager) => {
      if (dto.isHome) await manager.update(Page, { isHome: true }, { isHome: false });
      const page = manager.create(Page, {
        name: dto.name,
        isHome: dto.isHome ?? false,
        translations: translations.map((t) => manager.create(PageTranslation, this.toTranslation(t))),
      });
      return manager.save(page);
    });
  }

  async update(id: string, dto: UpdatePageDto) {
    const page = await this.get(id);
    dto.translations?.forEach((t) => this.assertBlocks(t.blocks, t.locale));
    const customFonts = dto.theme ? fontNames((await this.settings.get()).fonts) : [];

    return this.save(async (manager) => {
      if (dto.isHome) await manager.update(Page, { isHome: true }, { isHome: false });
      if (dto.name !== undefined) page.name = dto.name;
      if (dto.isHome !== undefined) page.isHome = dto.isHome;
      if (dto.theme !== undefined) page.theme = dto.theme === null ? null : cleanTheme(dto.theme, customFonts);

      for (const t of dto.translations ?? []) {
        const existing = page.translations.find((x) => x.locale === t.locale);
        if (existing) Object.assign(existing, this.toTranslation(t));
        else page.translations.push(manager.create(PageTranslation, this.toTranslation(t)));
      }
      return manager.save(page);
    });
  }

  /** Copies each translation's draft blocks to its published blocks. */
  async publish(id: string) {
    const page = await this.get(id);
    page.translations.forEach((t) => (t.publishedBlocks = t.blocks));
    page.publishedTheme = page.theme;
    page.status = 'published';
    page.publishedAt = new Date();
    return this.pages.save(page);
  }

  async unpublish(id: string) {
    const page = await this.get(id);
    page.status = 'draft';
    return this.pages.save(page);
  }

  async remove(id: string) {
    const page = await this.get(id);
    await this.pages.remove(page);
  }

  /** What visitors see. An empty slug means the home page. */
  async findPublished(locale: string, slug: string) {
    if (!isLocale(locale)) throw new NotFoundException();

    const qb = this.translations
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.page', 'p')
      .where('t.locale = :locale', { locale })
      .andWhere('p.status = :status', { status: 'published' })
      .andWhere('t.publishedBlocks IS NOT NULL');
    if (slug) qb.andWhere('t.slug = :slug', { slug });
    else qb.andWhere('p.isHome = true');

    const t = await qb.getOne();
    if (!t) throw new NotFoundException('Page not found');

    const siblings = await this.translations.find({
      where: { page: { id: t.page.id } },
      select: { locale: true, slug: true },
    });

    return {
      id: t.page.id,
      locale: t.locale,
      title: t.title,
      slug: t.slug,
      isHome: t.page.isHome,
      theme: t.page.publishedTheme,
      seoTitle: t.seoTitle || t.title,
      seoDescription: t.seoDescription,
      blocks: await this.expandBlocks(t.publishedBlocks ?? [], locale, t.page.id),
      alternates: siblings.map((s) => ({ locale: s.locale, slug: t.page.isHome ? '' : s.slug })),
      updatedAt: t.page.updatedAt,
    };
  }

  /** A block as visitors currently see it, e.g. to check a form submission against its fields. */
  async findPublishedBlock(pageId: string, locale: string, blockId: string): Promise<BlockNode | null> {
    const t = await this.translations.findOne({
      where: { page: { id: pageId, status: 'published' }, locale },
      relations: { page: true },
    });
    return t?.publishedBlocks?.find((b) => b.id === blockId) ?? null;
  }

  /** Published pages for the sitemap. */
  async listPublished() {
    const rows = await this.translations
      .createQueryBuilder('t')
      .innerJoin('t.page', 'p')
      .select(['t.locale AS locale', 't.slug AS slug', 'p.isHome AS "isHome"', 'p.updatedAt AS "updatedAt"'])
      .where('p.status = :status', { status: 'published' })
      .andWhere('t.publishedBlocks IS NOT NULL')
      .getRawMany<{ locale: string; slug: string; isHome: boolean; updatedAt: Date }>();
    const pages = rows.map((r) => ({ locale: r.locale, slug: r.isHome ? '' : r.slug, updatedAt: r.updatedAt }));
    return [...pages, ...(await this.collections.sitemapEntries())];
  }

  /** Attaches data that blocks need at render time, such as a collection list's items. */
  private async expandBlocks(blocks: BlockNode[], locale: string, pageId: string): Promise<BlockNode[]> {
    return Promise.all(
      blocks.map(async (b) => {
        // Forms post back to /public/forms/<page>/<block>, so they need to know their page.
        if (formBlockTypes.includes(b.type)) return { ...b, data: { pageId, blockId: b.id } };
        if (b.type !== 'collection-list') return b;
        const p = b.props as { collection?: string; limit?: number; tag?: string };
        const data = await this.collections.listPublished(locale, String(p.collection ?? ''), {
          limit: Number(p.limit) || 6,
          tag: p.tag || undefined,
        });
        return { ...b, data };
      }),
    );
  }

  /** Appends -2, -3, … until the slug is unused in that locale. */
  private async freeSlug(locale: string, base: string) {
    let slug = base;
    for (let n = 2; await this.translations.existsBy({ locale, slug }); n++) slug = `${base}-${n}`;
    return slug;
  }

  private toTranslation(t: TranslationDto | (Partial<TranslationDto> & { locale: string })) {
    return {
      locale: t.locale,
      title: t.title ?? '',
      slug: t.slug ?? '',
      seoTitle: t.seoTitle ?? '',
      seoDescription: t.seoDescription ?? '',
      blocks: mapRichText((t.blocks ?? []) as BlockNode[], cleanHtml),
    };
  }

  private assertBlocks(blocks: unknown, locale: string) {
    const errors = validateBlocks(blocks);
    if (errors.length) {
      throw new BadRequestException({
        message: `Invalid blocks for "${locale}"`,
        errors: errors.slice(0, 20),
      });
    }
  }

  private async save<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(work);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as QueryFailedError & { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException('Another page already uses this slug in the same language');
      }
      throw err;
    }
  }
}
