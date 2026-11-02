import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { AuthGuard, type AuthUser, Roles } from '../auth/auth.guard';
import { config } from '../config';
import { ConvertRequestDto, CreatePreviewDto, InvitePreviewDto, UpdatePreviewDto } from './previews.dto';
import { PreviewsService } from './previews.service';
import { currentSite, siteOrigin } from './site-context';
import type { Site } from './site.entity';
import { previewExpired, SitesService, toContext } from './sites.service';

const DAY = 86_400_000;

/** What a site's admins see of one of their previews (no other site's, no owner-only details). */
export const previewView = (s: Site) => ({
  id: s.id,
  name: s.name,
  url: siteOrigin(toContext(s)),
  previewSlug: s.previewSlug,
  expiresAt: s.expiresAt,
  expired: previewExpired(s),
  prospect: s.prospect,
  convertRequest: s.convertRequest,
  // Read only for the site's admins: only the owners turn the textile designer on, preview by preview.
  printDesigner: s.printDesigner,
  createdAt: s.createdAt,
});

class DeletePreviewDto {
  /** The preview's name, typed again to confirm. */
  @IsString()
  confirm: string;
}

/**
 * Admin → Preview sites, for the admins of a site the owner allows it on (Admin → Sites): they make previews under
 * their own site's address, within the owner's limits, and see only their own. Turning a bought one into a real site
 * stays with the owners; the admins ask for it.
 */
@Controller('admin/previews')
@UseGuards(AuthGuard)
@Roles('admin')
export class SitePreviewsController {
  constructor(
    private readonly sites: SitesService,
    private readonly previews: PreviewsService,
  ) {}

  /** This site's limits, or 403 when the owner has not allowed previews here. */
  private rules() {
    const site = currentSite();
    if (!site.hostsPreviews) throw new ForbiddenException('Preview sites are not allowed on this site');
    return { site, ...site.hostsPreviews };
  }

  /** One of this site's own previews (any other is "not found"). */
  private async own(id: string) {
    const { site } = this.rules();
    const preview = await this.sites.get(id).catch(() => null);
    if (!preview || !preview.preview || preview.previewHostId !== site.id) throw new NotFoundException('Preview not found');
    return preview;
  }

  @Get()
  async list() {
    const { site, max, maxDays } = this.rules();
    const all = await this.sites.hostedPreviews(site.id);
    return {
      max,
      maxDays,
      live: all.filter((p) => !previewExpired(p)).length,
      base: siteOrigin(site),
      graceDays: config.previewGraceDays,
      previews: all.map(previewView),
    };
  }

  @Post()
  async create(@Body() dto: CreatePreviewDto, @Req() req: { user: AuthUser }) {
    const { site, max, maxDays } = this.rules();
    if (dto.printDesigner) throw new ForbiddenException('Only the owners can allow the textile designer');
    const days = dto.days ?? Math.min(14, maxDays);
    if (days > maxDays) throw new BadRequestException(`A preview can stay online for at most ${maxDays} days`);
    if ((await this.sites.livePreviewCount(site.id)) >= max)
      throw new BadRequestException(`This site can have ${max} previews online at once. Delete or wait for one to end first.`);
    const { site: preview, invite } = await this.previews.create({ ...dto, days }, site.id, req.user.email);
    return { site: previewView(preview), invite };
  }

  /** More time (up to the site's limit, counted from when it was made), or new notes. */
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePreviewDto) {
    const { maxDays } = this.rules();
    let preview = await this.own(id);
    if (dto.expiresAt) throw new ForbiddenException('Only the owners can set the end date');
    if (dto.extendDays) {
      const from = Math.max(Date.now(), preview.expiresAt?.getTime() ?? Date.now());
      const last = preview.createdAt.getTime() + maxDays * DAY;
      if (from + dto.extendDays * DAY > last + 60_000)
        throw new BadRequestException(`A preview can stay online for at most ${maxDays} days from when it was made`);
      preview = await this.sites.extendPreview(id, dto.extendDays);
    }
    if (dto.prospect !== undefined) preview = await this.sites.setProspect(id, dto.prospect);
    return previewView(preview);
  }

  /** Sends someone the preview's admin panel (an account there and a link to choose its password). */
  @Post(':id/invite')
  @HttpCode(200)
  async invite(@Param('id', ParseUUIDPipe) id: string, @Body() dto: InvitePreviewDto) {
    const preview = await this.own(id);
    if (previewExpired(preview)) throw new BadRequestException('This preview has ended');
    return this.previews.invite(preview, dto.email);
  }

  /** The customer bought it: ask the owners to move it to this address ('' withdraws the request). */
  @Post(':id/convert-request')
  @HttpCode(200)
  async requestConversion(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConvertRequestDto) {
    await this.own(id);
    return previewView(await this.sites.requestConversion(id, dto.domain.trim() || null));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeletePreviewDto) {
    const preview = await this.own(id);
    if (
      String(dto?.confirm ?? '')
        .trim()
        .toLowerCase() !== preview.previewSlug
    )
      throw new BadRequestException(`Type ${preview.previewSlug} to confirm`);
    await this.previews.remove(preview);
  }
}
