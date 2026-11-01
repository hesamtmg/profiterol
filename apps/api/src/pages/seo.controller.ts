import { Body, Controller, ForbiddenException, Get, Put, Req, UseGuards } from '@nestjs/common';
import { robotsTxt, SITEMAP_LIMIT, type SeoSettings } from '@profiterol/blocks';
import { IsObject } from 'class-validator';
import { AuthGuard, type AuthUser, Roles } from '../auth/auth.guard';
import { previewHost } from '../config';
import { SettingsService } from '../settings/settings.controller';
import { currentSite, siteOrigin } from '../sites/site-context';
import { PagesService, sitemapPath } from './pages.service';

/** Why a site's admin cannot open Admin → SEO. */
export const SEO_NOT_ALLOWED = 'The owner manages this site’s search engine settings, sitemap and robots.txt';

/** Whether this person may change the current site's SEO: owners always, its admins when the owner allows it. */
export const canManageSeo = (user: AuthUser) => user.role === 'owner' || currentSite().seoAllowed;

class UpdateSeoDto {
  /** Checked and trimmed by cleanSeo. */
  @IsObject()
  seo: Record<string, unknown>;
}

/** The most addresses the SEO page lists; the sitemap itself has them all. */
const LISTED = 1000;

/**
 * Admin → SEO: the site's search engine settings, and the sitemap and robots.txt made from them. Admins use it when
 * the owner allows it for their site (Admin → Sites); owners always can.
 */
@Controller('admin/seo')
@UseGuards(AuthGuard)
@Roles('admin')
export class AdminSeoController {
  constructor(
    private readonly settings: SettingsService,
    private readonly pages: PagesService,
  ) {}

  @Get()
  async get(@Req() req: { user: AuthUser }) {
    if (!canManageSeo(req.user)) throw new ForbiddenException(SEO_NOT_ALLOWED);
    return this.view();
  }

  @Put()
  async update(@Body() dto: UpdateSeoDto, @Req() req: { user: AuthUser }) {
    if (!canManageSeo(req.user)) throw new ForbiddenException(SEO_NOT_ALLOWED);
    await this.settings.update({ seo: dto.seo as Partial<SeoSettings> });
    return this.view();
  }

  /** The settings, and what search engines are given: robots.txt as it is served, and every address in the sitemap. */
  private async view() {
    const site = currentSite();
    const { seo, updatedAt } = await this.settings.get();
    const origin = siteOrigin(site);
    // As the site's robots.txt route decides: a site whose address hosts previews keeps them out of search engines.
    const previews = !site.prefix && !!site.primary && (!!site.hostsPreviews || site.primary === previewHost());
    const hidden = !!seo?.hideSite || !!site.preview;
    const groups = hidden ? [] : (await this.pages.sitemap()).filter((g) => g.entries.length);
    const url = (p: { locale: string; path: string }) => {
      const path = sitemapPath(p);
      return `${origin}${p.locale ? encodeURI(path) : encodeURI(safeDecode(path))}`;
    };
    const sitemap = groups.map((g) => {
      const urls = g.entries.flatMap((e) => e.paths.map(url));
      return {
        group: g.group,
        count: urls.length,
        files: Math.max(1, Math.ceil(urls.length / SITEMAP_LIMIT)),
        urls: urls.slice(0, LISTED),
      };
    });
    return {
      seo,
      origin,
      previews,
      hidden,
      // A preview is never indexed, whatever its settings say.
      preview: !!site.preview,
      robots: robotsTxt(site.preview ? { ...seo, hideSite: true } : seo, origin, { previews }),
      sitemap: { url: `${origin}/sitemap.xml`, total: sitemap.reduce((n, g) => n + g.count, 0), groups: sitemap, updatedAt },
    };
  }
}

function safeDecode(s: string) {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
}
