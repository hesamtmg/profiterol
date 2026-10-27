import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { locales, seoTitle } from '@profiterol/blocks';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { Request } from 'express';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { AuthGuard, type AuthUser, Roles } from '../auth/auth.guard';
import { canSendMail, sendMail } from '../common/mail';
import { purgePageCache } from '../common/page-cache';
import { config } from '../config';
import { CollectionsService } from '../collections/collections.service';
import { MediaService } from '../media/media.module';
import { imagesIn, PagesService } from '../pages/pages.service';
import { SeedService } from '../seed.service';
import { SettingsService, SITE_LOCALES } from '../settings/settings.controller';
import { UsersService } from '../users/users.service';
import { currentSiteId, runInSite, siteOrigin, type SiteContext } from './site-context';
import { ADMIN_LANGS, type AdminLang, type Site, type SslStep, type SslStepState } from './site.entity';
import { SitesService, toContext } from './sites.service';

/** A one-time sign-in link from the owner's panel to another site's admin is valid this long. */
export const SSO_SECONDS = 60;

class CreateSiteDto {
  @IsString()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  /** The site's main address, e.g. example.com. */
  @IsString()
  @MaxLength(253)
  domain: string;

  /** Other addresses that redirect to it, e.g. www.example.com. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(19)
  @IsString({ each: true })
  aliases?: string[];

  /** Ask for a certificate straight away (DNS must already point here). */
  @IsOptional()
  @IsBoolean()
  ssl?: boolean;

  /** Invited as the site's admin. */
  @IsOptional()
  @ValidateIf((o: CreateSiteDto) => !!o.adminEmail)
  @IsEmail()
  adminEmail?: string;

  /** Fill the new site with the demo pages and collections (otherwise it starts empty). */
  @IsOptional()
  @IsBoolean()
  demo?: boolean;

  /** The language the site's admin panel opens in for people who have not picked one; '' follows their browser. */
  @IsOptional()
  @IsIn(ADMIN_LANGS)
  adminLang?: AdminLang;

  /** The language visitors land on; '' follows each visitor's browser. */
  @IsOptional()
  @IsIn(SITE_LOCALES)
  defaultLocale?: string;

  /** Allow the sublimation designer block and Print orders on this site. */
  @IsOptional()
  @IsBoolean()
  printDesigner?: boolean;
}

class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(253)
  domain?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(19)
  @IsString({ each: true })
  aliases?: string[];

  /** The language the site's admin panel opens in for people who have not picked one; '' follows their browser. */
  @IsOptional()
  @IsIn(ADMIN_LANGS)
  adminLang?: AdminLang;

  /** Allow the sublimation designer block and Print orders on this site. */
  @IsOptional()
  @IsBoolean()
  printDesigner?: boolean;
}

class DeleteSiteDto {
  /** The site's main address, typed again to confirm. */
  @IsString()
  confirm: string;
}

class InviteOwnerDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

const view = (s: Site) => {
  const c = toContext(s);
  return {
    id: s.id,
    name: s.name,
    primary: c.primary,
    aliases: c.domains.slice(1),
    domains: c.domains,
    url: siteOrigin(c),
    adminLang: s.adminLang,
    printDesigner: s.printDesigner,
    sslMode: s.sslMode,
    ssl: s.ssl,
    sslMessage: s.sslMessage,
    sslExpires: s.sslExpires,
    sslAttempts: s.sslAttempts,
    sslRetryAt: s.sslRetryAt,
    createdAt: s.createdAt,
  };
};

/** The owner's control panel for every site: Admin → Sites. */
@Controller('admin/sites')
@UseGuards(AuthGuard)
@Roles('owner')
export class AdminSitesController {
  constructor(
    private readonly sites: SitesService,
    private readonly seed: SeedService,
    private readonly users: UsersService,
    private readonly media: MediaService,
    private readonly pages: PagesService,
    private readonly collections: CollectionsService,
    private readonly settings: SettingsService,
    private readonly jwt: JwtService,
  ) {}

  @Get()
  async list() {
    const all = await this.sites.list();
    return {
      sites: all.map((s) => ({ ...view(s), current: s.id === currentSiteId() })),
      agent: this.sites.agent,
      owners: (await this.users.owners()).map((u) => ({ id: u.id, email: u.email, name: u.name, lastLoginAt: u.lastLoginAt })),
    };
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return view(await this.sites.get(id));
  }

  /** The certificate timeline, newest first. */
  @Get(':id/ssl-events')
  async events(@Param('id', ParseUUIDPipe) id: string) {
    await this.sites.get(id);
    return this.sites.listEvents(id);
  }

  /** Adds a site: its addresses, its settings and (optionally) the demo content and an invited admin. */
  @Post()
  async create(@Body() dto: CreateSiteDto) {
    const domains = await this.sites.checkDomains(dto.domain, dto.aliases ?? []);
    const site = await this.sites.create(dto.name ?? '', domains, dto.ssl ?? false, dto.adminLang ?? '', dto.printDesigner ?? false);
    const ctx = toContext(site);
    let invite: { email: string; link: string; emailed: boolean } | null = null;
    await runInSite(ctx, async () => {
      if (dto.demo !== false) await this.seed.seedSite(site.name);
      else await this.settings.update({ siteName: { fa: site.name, en: site.name } });
      if (dto.defaultLocale) await this.settings.update({ defaultLocale: dto.defaultLocale });
      if (dto.adminEmail) {
        const { user, secret } = await this.users.invite(dto.adminEmail, 'admin', '');
        const link = `${siteOrigin(ctx)}/admin/reset?token=${secret}`;
        const emailed = await sendMail({
          to: user.email,
          subject: `You are invited to edit ${site.name}`,
          text: `Hello,\n\nYou have been given an account to edit ${site.name}. Choose your password here (the link works for 7 days):\n\n${link}\n`,
        }).catch(() => false);
        invite = { email: user.email, link, emailed };
      }
    });
    return { site: view(site), invite };
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSiteDto) {
    let site = await this.sites.get(id);
    const before = toContext(site).domains;
    if (dto.name !== undefined) site = await this.sites.rename(id, dto.name);
    if (dto.adminLang !== undefined) site = await this.sites.setAdminLang(id, dto.adminLang);
    if (dto.printDesigner !== undefined) site = await this.sites.setPrintDesigner(id, dto.printDesigner);
    if (dto.domain !== undefined || dto.aliases !== undefined) {
      const c = toContext(site);
      site = await this.sites.setDomains(id, dto.domain ?? c.primary, dto.aliases ?? c.domains.slice(1));
    }
    await purgePageCache([...before, ...toContext(site).domains]);
    return view(site);
  }

  /** Ask for (or renew) the site's certificate. The domains agent picks it up within seconds. */
  @Post(':id/ssl')
  @HttpCode(200)
  async requestSsl(@Param('id', ParseUUIDPipe) id: string) {
    return view(await this.sites.requestSsl(id));
  }

  /** Serve the site over plain HTTP again. */
  @Delete(':id/ssl')
  async turnOffSsl(@Param('id', ParseUUIDPipe) id: string) {
    return view(await this.sites.turnOffSsl(id));
  }

  /** Deletes the site and everything in it: pages, collections, media (files too), settings, users, inbox. */
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeleteSiteDto) {
    const site = await this.sites.get(id);
    const c = toContext(site);
    if (dto.confirm?.trim().toLowerCase() !== c.primary) throw new BadRequestException(`Type ${c.primary} to confirm`);
    if (id === currentSiteId()) throw new BadRequestException('You cannot delete the site you are signed in to. Open another site first.');
    if ((await this.sites.sites.count()) <= 1) throw new BadRequestException('The last site cannot be deleted');
    await this.media.removeSiteFiles(id);
    await this.sites.remove(id);
    await purgePageCache(c.domains);
  }

  /**
   * A one-time link that signs the owner in to another site's admin. Sessions are per address (cookies cannot be
   * shared between domains), so moving between sites goes through this link.
   */
  @Post(':id/open')
  @HttpCode(200)
  async open(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user: AuthUser }) {
    const c = await this.sites.context(id);
    const ticket = await this.jwt.signAsync(
      { sub: req.user.sub, site: id, purpose: 'sso', ver: req.user.ver ?? 0 },
      { expiresIn: SSO_SECONDS, jwtid: randomUUID() },
    );
    return { url: `${siteOrigin(c)}/admin/sso#ticket=${ticket}` };
  }

  /** Invites another owner (they can manage every site). */
  @Post('owners')
  async inviteOwner(@Body() dto: InviteOwnerDto) {
    const { user, secret } = await this.users.invite(dto.email, 'owner', dto.name ?? '', true);
    const link = `${siteOrigin()}/admin/reset?token=${secret}`;
    const emailed = canSendMail()
      ? await sendMail({
          to: user.email,
          subject: 'You are invited to manage the websites',
          text: `Hello,\n\nYou have been made an owner: you can add and manage every site. Choose your password here (the link works for 7 days):\n\n${link}\n`,
        }).catch(() => false)
      : false;
    return { email: user.email, link, emailed };
  }

  /** Search engine readiness of one site: what is indexable, and what is missing or too long. */
  @Get(':id/seo-check')
  async seoCheck(@Param('id', ParseUUIDPipe) id: string) {
    const site = await this.sites.get(id);
    return runInSite(toContext(site), () => this.check(site));
  }

  private async check(site: Site) {
    const settings = await this.settings.get();
    const issues: { level: 'error' | 'warning'; message: string; where?: string }[] = [];
    const titles = new Map<string, string[]>();
    let urls = 0;

    const pages = (await this.pages.list()).filter((p) => p.status === 'published');
    for (const p of pages) {
      for (const t of p.translations.filter((x) => x.publishedBlocks)) {
        const where = `${p.name} (${t.locale})`;
        if (!p.noindex) urls++;
        if (p.noindex) continue;
        const siteName = settings.siteName?.[t.locale] || settings.siteName?.en || '';
        const title = p.isHome ? siteName : seoTitle(settings.seo, t.locale, t.seoTitle || t.title, siteName);
        titles.set(`${t.locale}:${title}`, [...(titles.get(`${t.locale}:${title}`) ?? []), where]);
        if (title.length > 60)
          issues.push({ level: 'warning', message: `Title is ${title.length} characters (search results show about 60)`, where });
        const description = t.seoDescription || settings.seo?.description?.[t.locale];
        if (!description) issues.push({ level: 'error', message: 'No meta description', where });
        else if (description.length > 160)
          issues.push({ level: 'warning', message: `Description is ${description.length} characters (keep it under 160)`, where });
        if (!t.ogImage && !imagesIn(t.publishedBlocks).length && !settings.seo?.shareImage && !settings.logo) {
          issues.push({ level: 'warning', message: 'No picture for link previews', where });
        }
      }
    }
    for (const c of await this.collections.listCollections()) {
      for (const i of (await this.collections.listItems(c.id)).filter((x) => x.status === 'published' && !x.noindex)) {
        for (const t of i.translations.filter((x) => c.slugs?.[x.locale])) {
          urls++;
          const where = `${c.name?.en || c.key}: ${t.title} (${t.locale})`;
          if (!t.seoDescription && !t.excerpt) issues.push({ level: 'error', message: 'No description or excerpt', where });
          if (!i.cover) issues.push({ level: 'warning', message: 'No cover picture', where });
        }
      }
    }
    for (const [key, where] of titles) {
      if (where.length > 1)
        issues.push({
          level: 'warning',
          message: `Same title "${key.split(':').slice(1).join(':')}" on ${where.length} pages`,
          where: where.join(', '),
        });
    }
    if (settings.seo?.hideSite)
      issues.unshift({ level: 'error', message: 'The whole site is hidden from search engines (Settings → SEO)' });
    if (site.ssl !== 'active') issues.unshift({ level: 'error', message: 'No HTTPS certificate: search engines rank HTTPS sites higher' });
    if (!settings.business?.type)
      issues.push({ level: 'warning', message: 'No business type set (Settings → Business), so no structured data on the home page' });
    if (!Object.values(settings.seo?.verification ?? {}).some(Boolean)) {
      issues.push({ level: 'warning', message: 'Not verified with any search console (Settings → SEO)' });
    }
    const errors = issues.filter((i) => i.level === 'error').length;
    const warnings = issues.length - errors;
    return {
      score: Math.max(0, 100 - errors * 10 - warnings * 3),
      urls,
      sitemap: `${siteOrigin()}/sitemap.xml`,
      languages: locales.map((l) => l.code),
      issues: issues.slice(0, 200),
    };
  }
}

/** The domains agent proves itself with INTERNAL_TOKEN. Without the token set, these routes do not exist. */
@Injectable()
export class InternalTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const given = Buffer.from(String(req.headers['x-internal-token'] ?? ''));
    const expected = Buffer.from(config.internalToken);
    if (!expected.length || given.length !== expected.length || !timingSafeEqual(given, expected)) throw new NotFoundException();
    return true;
  }
}

class EventDto {
  @IsIn(['queued', 'dns', 'challenge', 'certificate', 'nginx', 'reload', 'verify', 'renewed', 'removed'])
  step: SslStep;

  @IsIn(['running', 'ok', 'failed'])
  state: SslStepState;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;
}

class FinishDto {
  @IsBoolean()
  ok: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;

  @IsOptional()
  @IsISO8601()
  expires?: string;
}

class CertDto {
  /** The certificate's name: its first domain. */
  @IsString()
  name: string;

  @IsISO8601()
  expires: string;
}

class HeartbeatDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  serverIp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  version?: string;

  /** Domains the agent found in other Oblivion configs, so it leaves them alone. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  managedElsewhere?: string[];

  /** Expiry dates of the certificates on the server. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertDto)
  certificates?: CertDto[];
}

/** For the domains agent (docker/domains/agent.sh): which sites need certificates, and progress reports. */
@Controller('internal')
@UseGuards(InternalTokenGuard)
export class InternalSitesController {
  constructor(private readonly sites: SitesService) {}

  @Get('sites')
  async list() {
    const now = Date.now();
    const all = await this.sites.list();
    return all.map((s) => {
      const c: SiteContext = toContext(s);
      const stale = s.ssl === 'running' && now - s.updatedAt.getTime() > 15 * 60_000;
      const retry = s.ssl === 'failed' && !!s.sslRetryAt && s.sslRetryAt.getTime() <= now;
      return {
        id: s.id,
        name: s.name,
        primary: c.primary,
        domains: c.domains,
        sslMode: s.sslMode,
        ssl: s.ssl,
        // A certificate job to run now: asked for by the owner, an automatic retry, or one the agent never finished.
        due: s.sslMode === 'requested' && (s.ssl === 'queued' || retry || stale),
      };
    });
  }

  @Post('heartbeat')
  @HttpCode(200)
  async heartbeat(@Body() dto: HeartbeatDto) {
    this.sites.agent = {
      lastSeen: new Date().toISOString(),
      serverIp: dto.serverIp ?? this.sites.agent?.serverIp ?? '',
      version: dto.version ?? '',
      managedElsewhere: dto.managedElsewhere ?? [],
    };
    for (const cert of dto.certificates ?? []) await this.sites.certificateSeen(cert.name, new Date(cert.expires));
    return { ok: true };
  }

  @Post('sites/:id/events')
  @HttpCode(200)
  async event(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EventDto) {
    const site = await this.sites.get(id);
    await this.sites.event(id, dto.step, dto.state, dto.message ?? '');
    if (dto.state === 'running' && site.ssl !== 'running')
      await this.sites.sites.update(id, { ssl: 'running', sslMessage: dto.message ?? '' });
    else if (dto.state === 'running') await this.sites.sites.update(id, { sslMessage: dto.message ?? '' });
    this.sites.forget();
    return { ok: true };
  }

  @Post('sites/:id/ssl')
  @HttpCode(200)
  async finish(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FinishDto) {
    await this.sites.finishSsl(id, dto.ok, dto.message ?? '', dto.expires);
    // Links on the site switch between http and https.
    await purgePageCache((await this.sites.context(id)).domains);
    return { ok: true };
  }
}
