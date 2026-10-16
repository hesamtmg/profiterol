import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type BlockDef,
  BlockNode,
  cleanCss,
  cleanTheme,
  findBlock,
  fontNames,
  formBlockTypes,
  isLocale,
  locales,
  mapRichText,
  templateBlocks,
  validateBlocks,
} from '@profiterol/blocks';
import { DataSource, EntityManager, IsNull, LessThanOrEqual, Not, QueryFailedError, Repository } from 'typeorm';
import { CollectionsService } from '../collections/collections.service';
import { CustomBlocksService } from '../custom-blocks/custom-blocks.service';
import { SettingsService } from '../settings/settings.controller';
import { cleanHtml } from '../common/rich-text';
import { purgePageCache } from '../common/page-cache';
import { currentSite, currentSiteId, runInSite } from '../sites/site-context';
import { SitesService } from '../sites/sites.service';
import { slugify, UNIQUE_VIOLATION } from '../common/slug';
import { CreatePageDto, TranslationDto, UpdatePageDto } from './pages.dto';
import { Page, PageRevision, PageSnapshot, PageTranslation, RevisionKind } from './page.entity';

/** One page or item in the sitemap: its address in each language, when it last changed and its pictures. */
export interface SitemapEntry {
  updatedAt: Date;
  paths: { locale: string; path: string }[];
  images: string[];
}

/** Uploaded pictures used in a page's blocks, for image sitemaps. */
export function imagesIn(value: unknown): string[] {
  return [...new Set(JSON.stringify(value ?? '').match(/\/uploads\/[\w-]+\.(?:jpe?g|png|webp|avif|gif)/gi) ?? [])];
}

/** Versions kept per page; while editing, saves within this many minutes update the latest version. */
export const KEEP_REVISIONS = 50;
const SAVE_WINDOW_MINUTES = 10;

@Injectable()
export class PagesService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger(PagesService.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @InjectRepository(Page) private readonly pages: Repository<Page>,
    @InjectRepository(PageTranslation) private readonly translations: Repository<PageTranslation>,
    @InjectRepository(PageRevision) private readonly revisions: Repository<PageRevision>,
    private readonly dataSource: DataSource,
    private readonly collections: CollectionsService,
    private readonly settings: SettingsService,
    private readonly sites: SitesService,
    private readonly customBlocks: CustomBlocksService,
  ) {}

  /** Scheduled publishing: checks every 30 seconds for pages due to go online or offline. */
  onApplicationBootstrap() {
    this.timer = setInterval(() => this.runSchedule().catch((err) => this.log.warn(`Schedule check failed: ${err}`)), 30_000);
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  /** Runs for every site: each due page is published or taken offline as a request for its own site. */
  async runSchedule(now = new Date()) {
    const due = await this.pages.find({
      where: [{ publishAt: LessThanOrEqual(now) }, { unpublishAt: LessThanOrEqual(now), status: 'published' }],
      select: { id: true, siteId: true },
    });
    const changed = new Set<string>();
    for (const siteId of new Set(due.map((p) => p.siteId))) {
      await runInSite(await this.sites.context(siteId), async () => {
        for (const page of await this.pages.find({ where: { siteId, publishAt: LessThanOrEqual(now) } })) {
          await this.publish(page.id, '');
          this.log.log(`Published "${page.name}" as scheduled`);
        }
        for (const page of await this.pages.find({ where: { siteId, unpublishAt: LessThanOrEqual(now), status: 'published' } })) {
          await this.pages.update(page.id, { status: 'draft', unpublishAt: null });
          this.log.log(`Took "${page.name}" offline as scheduled`);
        }
      });
      changed.add(siteId);
    }
    // A passed end time on a page that is already offline has nothing left to do.
    await this.pages.update({ unpublishAt: LessThanOrEqual(now), status: Not('published') }, { unpublishAt: null });
    // Those sites' cached pages show the old state until cleared.
    for (const siteId of changed) await purgePageCache((await this.sites.context(siteId)).domains);
  }

  /** A time due before the next regular check gets its own timer, so "in a minute" means a minute. */
  private wakeFor(...times: (Date | null)[]) {
    for (const t of times) {
      const delay = t ? t.getTime() - Date.now() : Infinity;
      if (delay < 30_000) setTimeout(() => this.runSchedule().catch(() => undefined), Math.max(delay, 0) + 100).unref();
    }
  }

  list() {
    return this.pages.find({ where: { siteId: currentSiteId() }, order: { isHome: 'DESC', updatedAt: 'DESC' } });
  }

  async get(id: string) {
    const page = await this.pages.findOneBy({ id, siteId: currentSiteId() });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async create(dto: CreatePageDto & { slug?: string; titles?: Record<string, string> }) {
    const given = dto.translations ?? [];
    // Every page gets one translation per locale so the editor can switch languages straight away.
    const translations = await Promise.all(
      locales.map(async (l) => {
        const t = given.find((g) => g.locale === l.code);
        const blocks = dto.template ? templateBlocks(dto.template, l.code) : [];
        return (
          t ?? {
            locale: l.code,
            title: dto.titles?.[l.code] ?? dto.name,
            slug: await this.freeSlug(l.code, dto.slug ?? slugify(dto.name)),
            blocks,
          }
        );
      }),
    );
    const custom = await this.customBlocks.liveDefs();
    translations.forEach((t) => this.assertBlocks(t.blocks, t.locale, custom));

    const siteId = currentSiteId();
    return this.save(async (manager) => {
      if (dto.isHome) await manager.update(Page, { siteId, isHome: true }, { isHome: false });
      const page = manager.create(Page, {
        siteId,
        name: dto.name,
        isHome: dto.isHome ?? false,
        noindex: dto.noindex ?? false,
        translations: translations.map((t) => manager.create(PageTranslation, this.toTranslation(t, custom))),
      });
      return manager.save(page);
    });
  }

  async update(id: string, dto: UpdatePageDto, author = '') {
    const page = await this.get(id);
    const custom = dto.translations ? await this.customBlocks.liveDefs() : [];
    dto.translations?.forEach((t) => this.assertBlocks(t.blocks, t.locale, custom));
    const customFonts = dto.theme ? fontNames((await this.settings.get()).fonts) : [];

    return this.save(async (manager) => {
      if (dto.isHome) await manager.update(Page, { siteId: page.siteId, isHome: true }, { isHome: false });
      if (dto.name !== undefined) page.name = dto.name;
      if (dto.isHome !== undefined) page.isHome = dto.isHome;
      if (dto.noindex !== undefined) page.noindex = dto.noindex;
      if (dto.theme !== undefined) page.theme = dto.theme === null ? null : cleanTheme(dto.theme, customFonts);
      if (dto.customCss !== undefined) page.customCss = cleanCss(dto.customCss);
      if (dto.publishAt !== undefined) page.publishAt = dto.publishAt ? new Date(dto.publishAt) : null;
      if (dto.unpublishAt !== undefined) page.unpublishAt = dto.unpublishAt ? new Date(dto.unpublishAt) : null;
      if (page.publishAt && page.unpublishAt && page.unpublishAt <= page.publishAt) {
        throw new BadRequestException('The page must go offline after it goes online');
      }

      for (const t of dto.translations ?? []) {
        const existing = page.translations.find((x) => x.locale === t.locale);
        if (existing) Object.assign(existing, this.toTranslation(t, custom));
        else page.translations.push(manager.create(PageTranslation, this.toTranslation(t, custom)));
      }
      const saved = await manager.save(page);
      const changed = dto.translations || dto.theme !== undefined || dto.customCss !== undefined || dto.name !== undefined;
      if (changed) await this.record(manager, saved, 'save', author);
      this.wakeFor(saved.publishAt, saved.unpublishAt);
      return saved;
    });
  }

  /** Copies each translation's draft blocks to its published blocks, and keeps this version in the history. */
  async publish(id: string, author = '') {
    const page = await this.get(id);
    page.translations.forEach((t) => (t.publishedBlocks = t.blocks));
    page.publishedTheme = page.theme;
    page.publishedCss = page.customCss;
    page.status = 'published';
    page.publishedAt = new Date();
    page.publishAt = null;
    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(page);
      await this.record(manager, saved, 'publish', author);
      return saved;
    });
  }

  // ---------- History ----------

  private snapshot(page: Page): PageSnapshot {
    return {
      name: page.name,
      theme: page.theme,
      customCss: page.customCss,
      translations: page.translations.map((t) => ({
        locale: t.locale,
        title: t.title,
        slug: t.slug,
        seoTitle: t.seoTitle,
        seoDescription: t.seoDescription,
        ogImage: t.ogImage,
        blocks: t.blocks,
      })),
    };
  }

  /**
   * Keeps a version of the page. Saves while editing update the latest version if it is a save by the same
   * person from the last 10 minutes, so autosave does not flood the history.
   */
  private async record(manager: EntityManager, page: Page, kind: RevisionKind, author: string) {
    const repo = manager.getRepository(PageRevision);
    const snapshot = this.snapshot(page);
    if (kind === 'save') {
      const last = await repo.findOne({ where: { page: { id: page.id } }, order: { createdAt: 'DESC' } });
      if (last?.kind === 'save' && last.author === author && Date.now() - last.createdAt.getTime() < SAVE_WINDOW_MINUTES * 60_000) {
        last.snapshot = snapshot;
        await repo.save(last);
        return;
      }
    }
    await repo.save(repo.create({ page: { id: page.id }, kind, author, snapshot }));
    const old = await repo
      .createQueryBuilder('r')
      .select('r.id', 'id')
      .where('r."pageId" = :id', { id: page.id })
      .orderBy('r."createdAt"', 'DESC')
      .offset(KEEP_REVISIONS)
      .getRawMany<{ id: string }>();
    if (old.length) await repo.delete(old.map((r) => r.id));
  }

  async listRevisions(pageId: string) {
    await this.get(pageId);
    const rows = await this.revisions.find({ where: { page: { id: pageId } }, order: { createdAt: 'DESC' } });
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      author: r.author,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      blocks: Object.fromEntries(r.snapshot.translations.map((t) => [t.locale, t.blocks.length])),
      titles: Object.fromEntries(r.snapshot.translations.map((t) => [t.locale, t.title])),
    }));
  }

  async getRevision(pageId: string, revisionId: string) {
    await this.get(pageId);
    const rev = await this.revisions.findOne({ where: { id: revisionId, page: { id: pageId } } });
    if (!rev) throw new NotFoundException('Version not found');
    return rev;
  }

  /** Puts an old version back into the draft. The current draft is kept in the history first, so this can be undone. */
  async restore(pageId: string, revisionId: string, author: string) {
    const rev = await this.getRevision(pageId, revisionId);
    const page = await this.get(pageId);
    return this.save(async (manager) => {
      await manager
        .getRepository(PageRevision)
        .save({ page: { id: page.id }, kind: 'save' as const, author, snapshot: this.snapshot(page) });
      const { snapshot } = rev;
      page.name = snapshot.name;
      page.theme = snapshot.theme;
      page.customCss = snapshot.customCss ?? '';
      for (const t of snapshot.translations) {
        const existing = page.translations.find((x) => x.locale === t.locale);
        if (existing) Object.assign(existing, t);
      }
      const saved = await manager.save(page);
      await this.record(manager, saved, 'restore', author);
      return saved;
    });
  }

  /** A copy of the page as a new draft, with its own addresses. */
  async duplicate(id: string, author = '') {
    const source = await this.get(id);
    const translations = await Promise.all(
      source.translations.map(async (t) => ({
        locale: t.locale,
        title: t.title,
        slug: await this.freeSlug(t.locale, `${t.slug || slugify(source.name)}-copy`),
        seoTitle: t.seoTitle,
        seoDescription: t.seoDescription,
        ogImage: t.ogImage,
        blocks: t.blocks,
        siteId: source.siteId,
      })),
    );
    return this.save(async (manager) => {
      const page = manager.create(Page, {
        siteId: source.siteId,
        noindex: source.noindex,
        name: `${source.name} (copy)`,
        theme: source.theme,
        customCss: source.customCss,
        translations: translations.map((t) => manager.create(PageTranslation, t)),
      });
      const saved = await manager.save(page);
      await this.record(manager, saved, 'save', author);
      return saved;
    });
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
      .where('t.siteId = :siteId', { siteId: currentSiteId() })
      .andWhere('t.locale = :locale', { locale })
      .andWhere('p.status = :status', { status: 'published' })
      .andWhere('t.publishedBlocks IS NOT NULL');
    if (slug) qb.andWhere('t.slug = :slug', { slug });
    else qb.andWhere('p.isHome = true');

    const t = await qb.getOne();
    if (!t) throw new NotFoundException('Page not found');

    // Only languages visitors can open: hreflang links to a draft-only translation would lead search engines to a 404.
    const siblings = await this.translations.find({
      where: { page: { id: t.page.id }, publishedBlocks: Not(IsNull()) },
      select: { locale: true, slug: true },
    });

    return {
      id: t.page.id,
      locale: t.locale,
      title: t.title,
      slug: t.slug,
      isHome: t.page.isHome,
      theme: t.page.publishedTheme,
      customCss: t.page.publishedCss,
      seoTitle: t.seoTitle || t.title,
      seoDescription: t.seoDescription,
      ogImage: t.ogImage,
      noindex: t.page.noindex,
      publishedAt: t.page.publishedAt,
      blocks: await this.expandBlocks(t.publishedBlocks ?? [], locale, t.page.id),
      alternates: siblings.map((s) => ({ locale: s.locale, slug: t.page.isHome ? '' : s.slug })),
      updatedAt: t.page.updatedAt,
    };
  }

  /** A block as visitors currently see it, e.g. to check a form submission against its fields. */
  async findPublishedBlock(pageId: string, locale: string, blockId: string): Promise<BlockNode | null> {
    const t = await this.translations.findOne({
      where: { page: { id: pageId, status: 'published' }, locale, siteId: currentSiteId() },
      relations: { page: true },
    });
    return t?.publishedBlocks ? (findBlock(t.publishedBlocks, blockId)?.block ?? null) : null;
  }

  /**
   * Everything search engines may index on this site, for the sitemap: each page and item with its address in every
   * language and its pictures. Hidden (noindex) and unpublished content is left out.
   */
  async sitemap(): Promise<{ group: string; entries: SitemapEntry[] }[]> {
    const rows = await this.translations
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.page', 'p')
      .where('t.siteId = :siteId', { siteId: currentSiteId() })
      .andWhere('p.status = :status', { status: 'published' })
      .andWhere('p.noindex = false')
      .andWhere('t.publishedBlocks IS NOT NULL')
      .getMany();
    const byPage = new Map<string, PageTranslation[]>();
    for (const t of rows) byPage.set(t.page.id, [...(byPage.get(t.page.id) ?? []), t]);
    const pages: SitemapEntry[] = [...byPage.values()].map((list) => ({
      updatedAt: list[0].page.updatedAt,
      paths: list.map((t) => ({ locale: t.locale, path: t.page.isHome ? '' : t.slug })),
      images: [...new Set(list.flatMap((t) => [t.ogImage, ...imagesIn(t.publishedBlocks)]).filter(Boolean))].slice(0, 50),
    }));
    return [
      { group: 'pages', entries: pages },
      ...(await this.collections.sitemapGroups((await this.settings.get()).seo?.collectionPages !== false)),
    ];
  }

  /** Attaches data that blocks need at render time, such as a collection list's items (inside columns too). */
  private async expandBlocks(blocks: BlockNode[], locale: string, pageId: string): Promise<BlockNode[]> {
    return Promise.all(
      blocks.map(async (b) => {
        if (b.children) {
          return { ...b, children: await Promise.all(b.children.map((column) => this.expandBlocks(column, locale, pageId))) };
        }
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

  /** Appends -2, -3, … until the slug is unused in that locale on this site. */
  private async freeSlug(locale: string, base: string) {
    const siteId = currentSiteId();
    let slug = base;
    for (let n = 2; await this.translations.existsBy({ siteId, locale, slug }); n++) slug = `${base}-${n}`;
    return slug;
  }

  private toTranslation(t: TranslationDto | (Partial<TranslationDto> & { locale: string }), custom: BlockDef[]) {
    return {
      siteId: currentSite().id,
      locale: t.locale,
      title: t.title ?? '',
      slug: t.slug ?? '',
      seoTitle: t.seoTitle ?? '',
      seoDescription: t.seoDescription ?? '',
      ogImage: t.ogImage ?? '',
      blocks: mapRichText((t.blocks ?? []) as BlockNode[], cleanHtml, custom),
    };
  }

  /** `custom`: the site's approved custom blocks, which pages may use besides the built-in ones. */
  private assertBlocks(blocks: unknown, locale: string, custom: BlockDef[]) {
    const errors = validateBlocks(blocks, custom);
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
