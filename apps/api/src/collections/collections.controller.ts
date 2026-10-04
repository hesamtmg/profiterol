import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { CreateCollectionDto, CreateItemDto, UpdateCollectionDto, UpdateItemDto } from './collections.dto';
import { CollectionsService } from './collections.service';

@Controller('admin/collections')
@UseGuards(AuthGuard)
export class AdminCollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Get()
  list() {
    return this.service.listCollections();
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateCollectionDto) {
    return this.service.createCollection(dto);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCollection(id);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCollectionDto) {
    return this.service.updateCollection(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeCollection(id);
  }

  @Get(':id/items')
  items(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listItems(id);
  }

  @Post(':id/items')
  createItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateItemDto) {
    return this.service.createItem(id, dto);
  }

  @Get(':id/items/:itemId')
  getItem(@Param('id', ParseUUIDPipe) id: string, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.service.getItem(id, itemId);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.service.updateItem(id, itemId, dto);
  }

  @Post(':id/items/:itemId/publish')
  @HttpCode(200)
  publish(@Param('id', ParseUUIDPipe) id: string, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.service.setStatus(id, itemId, true);
  }

  @Post(':id/items/:itemId/unpublish')
  @HttpCode(200)
  unpublish(@Param('id', ParseUUIDPipe) id: string, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.service.setStatus(id, itemId, false);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(204)
  removeItem(@Param('id', ParseUUIDPipe) id: string, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.service.removeItem(id, itemId);
  }
}

/** Read-only endpoints for the site renderer and the editor's collection-list preview. */
@Controller('public/:locale')
export class PublicCollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Get('items')
  list(
    @Param('locale') locale: string,
    @Query('collection') key = '',
    @Query('limit') limit = '12',
    @Query('tag') tag = '',
  ) {
    return this.service.listPublished(locale, key, { limit: Number(limit) || 12, tag: tag || undefined });
  }

  @Get('collection')
  collection(@Param('locale') locale: string, @Query('slug') slug = '') {
    return this.service.findPublicCollection(locale, slug);
  }

  @Get('item')
  item(@Param('locale') locale: string, @Query('collection') collection = '', @Query('slug') slug = '') {
    return this.service.findPublishedItem(locale, collection, slug);
  }
}
