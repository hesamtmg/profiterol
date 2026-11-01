import { Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { config } from '../config';
import { MediaService } from '../media/media.module';
import { SitesService } from './sites.service';

const HOUR = 60 * 60_000;

/**
 * Ended previews go offline by themselves (see previewExpired); this deletes them, with their files, once they have
 * been over for PREVIEW_GRACE_DAYS, so the owner has that long to extend or convert them. Checked every hour.
 */
@Injectable()
export class PreviewsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger(PreviewsService.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly sites: SitesService,
    private readonly media: MediaService,
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
      await this.media.removeSiteFiles(site.id);
      await this.sites.remove(site.id);
      this.log.log(`Deleted the ended preview "${site.name}" (${site.previewSlug})`);
      removed++;
    }
    return removed;
  }
}
