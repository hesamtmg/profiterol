import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { getSiteTemplate } from '@profiterol/blocks';
import { sendMail } from '../common/mail';
import { config } from '../config';
import { MediaService } from '../media/media.module';
import { PagesService } from '../pages/pages.service';
import { SeedService } from '../seed.service';
import { SettingsService } from '../settings/settings.controller';
import { INVITE_DAYS, UsersService } from '../users/users.service';
import type { CreatePreviewDto } from './previews.dto';
import { runInSite, siteOrigin } from './site-context';
import type { Site } from './site.entity';
import { SitesService, toContext } from './sites.service';

const HOUR = 60 * 60_000;

/**
 * Preview sites: made by the owners (on PREVIEW_URL) or by the admins of a site the owner allows it on (under that
 * site's address). Ended previews go offline by themselves (see previewExpired); this deletes them, with their files,
 * once they have been over for PREVIEW_GRACE_DAYS, so there is that long to extend or convert them. Checked hourly.
 */
@Injectable()
export class PreviewsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger(PreviewsService.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly sites: SitesService,
    private readonly media: MediaService,
    private readonly seed: SeedService,
    private readonly settings: SettingsService,
    private readonly pages: PagesService,
    private readonly users: UsersService,
  ) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => this.sweep().catch((err) => this.log.warn(`Preview clean-up failed: ${err}`)), HOUR);
    this.timer.unref();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  async sweep() {
    let removed = 0;
    for (const site of await this.sites.endedPreviews(config.previewGraceDays)) {
      await this.remove(site);
      this.log.log(`Deleted the ended preview "${site.name}" (${site.previewSlug})`);
      removed++;
    }
    return removed;
  }

  /** Deletes a site and everything in it, its files and its own previews included. */
  async remove(site: Site) {
    if (!site.preview) for (const p of await this.sites.hostedPreviews(site.id)) await this.remove(p);
    await this.media.removeSiteFiles(site.id);
    await this.sites.remove(site.id);
  }

  /**
   * Makes a preview from the demo content, a whole-site template (its pages published, the first one the home page)
   * or nothing, and invites its admin. `hostId`: the site whose admins made it (null for the owners' own).
   */
  async create(dto: CreatePreviewDto, hostId: string | null, author: string) {
    const template = dto.template ?? 'demo';
    if (!['demo', 'blank'].includes(template) && !getSiteTemplate(template)) throw new BadRequestException('Template not found');
    const site = await this.sites.createPreview(
      dto.name,
      dto.slug,
      dto.days ?? 14,
      dto.prospect ?? '',
      dto.adminLang ?? '',
      hostId,
      dto.printDesigner ?? false,
    );
    let invite: { email: string; link: string; emailed: boolean } | null = null;
    try {
      await runInSite(toContext(site), async () => {
        if (template === 'demo') await this.seed.seedSite(site.name);
        else await this.settings.update({ siteName: { fa: site.name, en: site.name } });
        if (getSiteTemplate(template)) await this.pages.applySiteTemplate(template, { publish: true, home: true, author });
        if (dto.defaultLocale) await this.settings.update({ defaultLocale: dto.defaultLocale });
      });
      if (dto.adminEmail) invite = await this.invite(site, dto.adminEmail);
    } catch (err) {
      // Half a preview helps nobody: take it away again, so the name can be used once the problem is fixed.
      await this.sites.remove(site.id).catch(() => undefined);
      throw err;
    }
    return { site, invite };
  }

  /**
   * Gives someone the preview's admin panel: an admin account on it (made if needed) and a link to choose its
   * password, emailed when email is set up. Valid 7 days; asking again gives a new link.
   */
  async invite(site: Site, email: string) {
    const ctx = toContext(site);
    return runInSite(ctx, async () => {
      // Only this preview's own account is reused (a new link). findByEmail also finds owners, and handing out a
      // password link for an owner's account would hand over every site.
      const found = await this.users.findByEmail(email);
      if (found && found.siteId !== site.id) throw new ConflictException('Someone with this email already has an account');
      const existing = found;
      const { user, secret } = existing
        ? { user: existing, secret: await this.users.newResetSecret(existing.id, INVITE_DAYS * 24) }
        : await this.users.invite(email, 'admin', '');
      const link = `${siteOrigin(ctx)}/admin/reset?token=${secret}`;
      const until = site.expiresAt?.toISOString().slice(0, 10);
      const emailed = await sendMail({
        to: user.email,
        subject: `Your preview of ${site.name} is ready`,
        text: `Hello,\n\nHere is a preview of your website: ${siteOrigin(ctx)}\n\nYou can change everything in it. Choose your password here (the link works for 7 days):\n\n${link}\n\nThe preview is online until ${until}.\n`,
      }).catch(() => false);
      return { email: user.email, link, emailed };
    });
  }
}
