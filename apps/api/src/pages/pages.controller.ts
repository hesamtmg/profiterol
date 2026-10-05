import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { blocks, locales } from '@profiterol/blocks';
import { AuthGuard } from '../auth/auth.guard';
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
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePageDto) {
    return this.pages.update(id, dto);
  }

  @Post(':id/publish')
  @HttpCode(200)
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.pages.publish(id);
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
