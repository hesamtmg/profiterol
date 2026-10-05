import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { blocks, locales } from '@profiterol/blocks';
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
