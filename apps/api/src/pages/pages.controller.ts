import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { blocks, getSiteTemplate, locales, pageTemplates, siteTemplates, siteTemplateTheme } from '@profiterol/blocks';
import { NotFoundException } from '@nestjs/common';
import { Roles } from '../auth/auth.guard';
import { SettingsService } from '../settings/settings.controller';
import { AuthGuard, type AuthUser } from '../auth/auth.guard';

type Authed = { user: AuthUser };
import { CreatePageDto, UpdatePageDto } from './pages.dto';
import { PagesService } from './pages.service';

/** Public, read-only endpoints used by the site renderer. */
@Controller('public')
export class PublicPagesController {
  constructor(private readonly pages: PagesService) {}

  @Get(':locale/page')
  page(@Param('locale') locale: string, @Query('slug') slug = '') {
    return this.pages.findPublished(locale, slug.replace(/^\/+|\/+$/g, ''));
  }

  @Get('sitemap')
  sitemap() {
    return this.pages.listPublished();
  }
}

@Controller('admin/pages')
@UseGuards(AuthGuard)
export class AdminPagesController {
  constructor(private readonly pages: PagesService) {}

  /** Block registry and locales, so the editor always matches what the API accepts. */
  @Get('schema')
  schema() {
    return { blocks, locales };
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
