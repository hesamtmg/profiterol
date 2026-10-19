import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { blocks, getSiteTemplate, locales, pageTemplates, siteTemplates, siteTemplateTheme, withCommonFields } from '@profiterol/blocks';
import { NotFoundException } from '@nestjs/common';
import { Roles } from '../auth/auth.guard';
import { MediaService } from '../media/media.module';
import { CustomBlocksService, moduleUrl } from '../custom-blocks/custom-blocks.service';
import { SettingsService } from '../settings/settings.controller';
import { AuthGuard, type AuthUser } from '../auth/auth.guard';

type Authed = { user: AuthUser };
import { AddBlocksDto, CreatePageDto, UpdatePageDto } from './pages.dto';
import { PagesService } from './pages.service';

/** Public, read-only endpoints used by the site renderer. */
@Controller('public')
export class PublicPagesController {
  constructor(
    private readonly pages: PagesService,
    private readonly media: MediaService,
    private readonly customBlocks: CustomBlocksService,
  ) {}

  /** A published page, with blurred previews and descriptions of the photos in it, and its custom blocks' code. */
  @Get(':locale/page')
  async page(@Param('locale') locale: string, @Query('slug') slug = '') {
    const page = await this.pages.findPublished(locale, slug.replace(/^\/+|\/+$/g, ''));
    return {
      ...page,
      media: await this.media.hintsFor(page.blocks, locale),
      customBlocks: await this.customBlocks.scriptsFor(page.blocks),
    };
  }

  @Get('sitemap')
  sitemap() {
    return this.pages.sitemap();
  }
}

@Controller('admin/pages')
@UseGuards(AuthGuard)
export class AdminPagesController {
  constructor(
    private readonly pages: PagesService,
    private readonly customBlocks: CustomBlocksService,
  ) {}

  /**
   * Block registry and locales, so the editor always matches what the API accepts. `custom`: the site's approved
   * custom blocks, with where to load each one's code.
   */
  @Get('schema')
  async schema() {
    const custom = await this.customBlocks.list();
    return {
      blocks,
      locales,
      custom: custom.flatMap((b) =>
        b.live && b.status === 'live' ? [{ def: withCommonFields(b.live.def), url: moduleUrl(b.id, b.live.hash) }] : [],
      ),
    };
  }

  /** Starting points for new pages (names and descriptions; the blocks are made on the server). */
  @Get('templates')
  templates() {
    return pageTemplates.map(({ key, name, description, icon }) => ({ key, name, description, icon }));
  }

  @Get()
  list() {
    return this.pages.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.pages.get(id);
  }

  @Post()
  create(@Body() dto: CreatePageDto) {
    return this.pages.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePageDto, @Req() req: Authed) {
    return this.pages.update(id, dto, req.user.email);
  }

  @Post(':id/publish')
  @HttpCode(200)
  publish(@Param('id', ParseUUIDPipe) id: string, @Req() req: Authed) {
    return this.pages.publish(id, req.user.email);
  }

  /** Adds copies of blocks (e.g. from the page being edited) to another page's draft. */
  @Post(':id/blocks')
  @HttpCode(200)
  addBlocks(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddBlocksDto, @Req() req: Authed) {
    return this.pages.addBlocks(id, dto, req.user.email);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id', ParseUUIDPipe) id: string, @Req() req: Authed) {
    return this.pages.duplicate(id, req.user.email);
  }

  @Get(':id/revisions')
  revisions(@Param('id', ParseUUIDPipe) id: string) {
    return this.pages.listRevisions(id);
  }

  @Get(':id/revisions/:revisionId')
  revision(@Param('id', ParseUUIDPipe) id: string, @Param('revisionId', ParseUUIDPipe) revisionId: string) {
    return this.pages.getRevision(id, revisionId);
  }

  @Post(':id/revisions/:revisionId/restore')
  @HttpCode(200)
  restore(@Param('id', ParseUUIDPipe) id: string, @Param('revisionId', ParseUUIDPipe) revisionId: string, @Req() req: Authed) {
    return this.pages.restore(id, revisionId, req.user.email);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.pages.unpublish(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pages.remove(id);
  }
}

/** Whole-site templates: a theme and a set of draft pages, added to the menu. */
@Controller('admin/site-templates')
@UseGuards(AuthGuard)
@Roles('admin')
export class SiteTemplatesController {
  constructor(
    private readonly pages: PagesService,
    private readonly settings: SettingsService,
  ) {}

  @Get()
  list() {
    return siteTemplates.map(({ key, name, description, theme, pages }) => ({
      key,
      name,
      description,
      theme,
      pages: pages.map((p) => p.name),
    }));
  }

  /**
   * Sets the site theme and adds the template's pages as drafts (existing pages are left alone), plus menu links
   * to them. Nothing goes live until the pages are published.
   */
  @Post(':key/apply')
  @HttpCode(200)
  async apply(@Param('key') key: string, @Req() req: Authed) {
    const template = getSiteTemplate(key);
    if (!template) throw new NotFoundException('Template not found');
    const created: { id: string; name: string; slug: string }[] = [];
    for (const p of template.pages) {
      const page = await this.pages.create({ name: p.name.en, template: p.template, slug: p.slug, titles: p.name });
      created.push({ id: page.id, name: page.name, slug: page.translations.find((t) => t.locale === 'en')?.slug ?? p.slug });
    }
    const current = await this.settings.get();
    const menu = [...current.menu];
    // The first page is the home page; the others go in the menu.
    template.pages.slice(1).forEach((p, i) => {
      const href = created[i + 1].slug;
      if (!menu.some((m) => m.href === href)) menu.push({ label: { ...p.name }, href });
    });
    await this.settings.update({ theme: siteTemplateTheme(key) ?? current.theme, menu });
    return { pages: created, author: req.user.email };
  }
}
