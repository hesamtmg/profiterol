import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { NextFunction, Request, Response } from 'express';
import { DataSource, In, LessThan, Repository } from 'typeorm';
import { config, previewHost } from '../config';
import { runInSite, siteOrigin, type SiteContext } from './site-context';
import { type AdminLang, Site, SiteDomain, SslEvent, type SslStep, type SslStepState } from './site.entity';

/** example.com, sub.example.co.uk, localhost, xn--mgbh0fb.xn--mgbaam7a8h (IDN in punycode). */
const HOSTNAME = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*$/;
const CACHE_MS = 30_000;
/** Failed certificate attempts are retried by themselves after these waits; after that the owner decides. */
const RETRY_MINUTES = [10, 30, 60];

/** Lowercase, no scheme, port, path or trailing dot; Unicode names become punycode. */
export function normalizeDomain(input: string): string {
  let d = String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
  try {
    d = new URL(`http://${d}`).hostname;
  } catch {
    // Not a valid name; refused below.
  }
  return d;
}

export function checkDomain(input: string): string {
  const d = normalizeDomain(input);
  if (!HOSTNAME.test(d) || /^\d+(\.\d+){3}$/.test(d)) throw new BadRequestException(`"${input}" is not a valid domain name`);
  return d;
}

/** A preview's name in its address: /preview/<slug>. Lowercase letters, digits and dashes, 3 to 40 long. */
export const PREVIEW_SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
/** Names that would read as part of the app rather than someone's site. */
const RESERVED_SLUGS = new Set(['admin', 'api', 'uploads', 'preview', 'previews', 'www', 'mail', 'demo', 'test', 'new', 'nuxt']);
/** The path a preview is served under on PREVIEW_URL. */
export const previewPrefix = (slug: string) => `/preview/${slug}`;

export function checkPreviewSlug(input: string): string {
  const slug = String(input ?? '')
    .trim()
    .toLowerCase();
  if (!PREVIEW_SLUG.test(slug) || slug.includes('--'))
    throw new BadRequestException('The preview name may have 3 to 40 lowercase letters, digits and single dashes');
  if (RESERVED_SLUGS.has(slug)) throw new BadRequestException(`"${slug}" cannot be used as a preview name`);
  return slug;
}

/** Whether a preview's time is up. */
export const previewExpired = (site: Pick<Site, 'preview' | 'expiresAt'>, now = Date.now()) =>
  site.preview && !!site.expiresAt && site.expiresAt.getTime() <= now;

/** The relations toContext needs: a preview's host site and its addresses. */
export const SITE_RELATIONS = { previewHost: { domains: true } } as const;

/** https://example.com for a site with addresses (no port, no path). */
const ownOrigin = (site: Site) => {
  const c = toContext(site);
  return c.primary ? `${c.https ? 'https' : 'http'}://${c.primary}` : '';
};

export const toContext = (site: Site): SiteContext => {
  if (site.preview) {
    // The owners' previews live on PREVIEW_URL; a site's own previews under that site's address.
    const host = site.previewHostId ? site.previewHost : null;
    const base = site.previewHostId ? (host ? ownOrigin(host) : '') : config.previewUrl;
    let url: URL | null = null;
    try {
      url = base ? new URL(base) : null;
    } catch {
      url = null;
    }
    return {
      id: site.id,
      name: site.name,
      adminLang: site.adminLang ?? '',
      printDesigner: site.printDesigner ?? false,
      seoAllowed: site.seoAllowed ?? true,
      // Previews have no addresses of their own: the domains agent never sees them, and nothing is cached for them.
      primary: url?.hostname ?? '',
      domains: [],
      https: url?.protocol === 'https:',
      prefix: previewPrefix(site.previewSlug ?? ''),
      prefixBase: base,
      preview: { expiresAt: site.expiresAt?.toISOString() ?? null, expired: previewExpired(site), home: base, hostId: site.previewHostId },
      hostsPreviews: null,
    };
  }
  const sorted = [...(site.domains ?? [])].sort(
    (a, b) => Number(b.primary) - Number(a.primary) || a.createdAt.getTime() - b.createdAt.getTime(),
  );
  return {
    id: site.id,
    name: site.name,
    adminLang: site.adminLang ?? '',
    printDesigner: site.printDesigner ?? false,
    seoAllowed: site.seoAllowed ?? true,
    primary: sorted[0]?.domain ?? '',
    domains: sorted.map((d) => d.domain),
    https: site.ssl === 'active' || (!!config.siteUrl.startsWith('https://') && new URL(config.siteUrl).hostname === sorted[0]?.domain),
    prefix: '',
    prefixBase: '',
    preview: null,
    hostsPreviews: site.previewsAllowed ? { max: site.previewMax, maxDays: site.previewMaxDays } : null,
  };
};

@Injectable()
export class SitesService {
  private readonly log = new Logger(SitesService.name);
  private cache = new Map<string, { site: SiteContext | null; at: number }>();
  private only: { site: SiteContext | null; at: number } | null = null;
  private previews = new Map<string, { site: Site | null; at: number }>();
  /** What the domains agent last reported (kept in memory: it reports every few seconds). */
  agent: { lastSeen: string; serverIp: string; version: string; managedElsewhere: string[] } | null = null;

  constructor(
    @InjectRepository(Site) readonly sites: Repository<Site>,
    @InjectRepository(SiteDomain) readonly domains: Repository<SiteDomain>,
    @InjectRepository(SslEvent) readonly events: Repository<SslEvent>,
    private readonly dataSource: DataSource,
  ) {}

  /** Forget cached lookups after any change to sites or domains. */
  forget() {
    this.cache.clear();
    this.only = null;
    this.previews.clear();
  }

  /**
   * The site for an address. With a single site, every address is that site, so installations that serve one
   * domain (and scripts calling the API by its internal name) work exactly as before. With several, an unknown
   * address belongs to no site.
   */
  async resolve(host: string): Promise<SiteContext | null> {
    const domain = normalizeDomain(host);
    const hit = this.cache.get(domain);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.site;

    const row = domain ? await this.domains.findOne({ where: { domain }, relations: { site: true } }) : null;
    let site: SiteContext | null = null;
    if (row) {
      site = toContext(await this.sites.findOneOrFail({ where: { id: row.siteId }, relations: SITE_RELATIONS }));
    } else {
      site = await this.onlySite();
      // A preview is never "the only site" for any address: it lives under its path only.
      if (site?.prefix) site = null;
    }
    if (this.cache.size > 1000) this.cache.clear();
    this.cache.set(domain, { site, at: Date.now() });
    return site;
  }

  private async onlySite(): Promise<SiteContext | null> {
    if (this.only && Date.now() - this.only.at < CACHE_MS) return this.only.site;
    const all = await this.sites.find({ take: 2, relations: SITE_RELATIONS });
    this.only = { site: all.length === 1 ? toContext(all[0]) : null, at: Date.now() };
    return this.only.site;
  }

  /** The site (preview or converted) that has this preview name, if any. */
  async findPreview(slug: string): Promise<Site | null> {
    const hit = this.previews.get(slug);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.site;
    const site = PREVIEW_SLUG.test(slug) ? await this.sites.findOne({ where: { previewSlug: slug }, relations: SITE_RELATIONS }) : null;
    if (this.previews.size > 1000) this.previews.clear();
    this.previews.set(slug, { site, at: Date.now() });
    return site;
  }

  /**
   * The site for a request. Normally that is its address; on PREVIEW_URL's address, a request under
   * /preview/<name> (nginx strips the path and sends it as X-Site-Prefix) is for that preview instead. The header
   * means nothing on any other address, and nginx always overwrites it, so visitors cannot send their own.
   */
  async resolveRequest(host: string, prefix: string): Promise<SiteContext | null> {
    if (!prefix) return this.resolve(host);
    const slug = /^\/preview\/([a-z0-9-]+)$/.exec(prefix)?.[1];
    if (!slug) return null;
    const site = await this.findPreview(slug);
    if (!site) return null;
    // Only under the address it was made on: its maker's site, or PREVIEW_URL for the owners' own.
    if (site.previewHostId) {
      if ((await this.resolve(host))?.id !== site.previewHostId) return null;
    } else if (!previewHost() || normalizeDomain(host) !== previewHost()) return null;
    // A converted preview answers too (with its new address), so old preview links can be sent on to it.
    const ctx = toContext(site);
    if (site.preview) return ctx;
    const base = site.previewHostId ? (site.previewHost ? ownOrigin(site.previewHost) : '') : config.previewUrl;
    return { ...ctx, prefix: previewPrefix(slug), prefixBase: base, movedTo: siteOrigin(ctx) };
  }

  /** Express middleware: runs the request as its site's request, or answers 404 for an address with no site. */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Health checks and the domains agent are not for any one site; uploads are served by file name.
      if (/^\/api\/(health|internal)(\/|$)|^\/uploads\//.test(req.path)) return next();
      const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '').split(',')[0];
      const prefix = String(req.headers['x-site-prefix'] ?? '').trim();
      this.resolveRequest(host, prefix).then(
        (site) => {
          if (!site) {
            res.status(404).json({ statusCode: 404, message: 'No site at this address' });
            return;
          }
          // A converted preview's old address: only its public settings answer (they say where it moved).
          if (prefix && !site.preview && !/^\/api\/public\/settings$/.test(req.path)) {
            res.status(404).json({ statusCode: 404, message: 'This preview has moved' });
            return;
          }
          const port = /:(\d+)$/.exec(host.trim())?.[1];
          runInSite(port ? { ...site, port } : site, () => next());
        },
        (err) => next(err),
      );
    };
  }

  async get(id: string) {
    const site = await this.sites.findOne({ where: { id }, relations: SITE_RELATIONS });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  async context(id: string) {
    return toContext(await this.get(id));
  }

  list() {
    return this.sites.find({ order: { createdAt: 'ASC' }, relations: SITE_RELATIONS });
  }

  /** Domains must be valid and not used by another site. Returns them normalized, primary first. */
  async checkDomains(primary: string, aliases: string[], ownSiteId?: string): Promise<string[]> {
    const all = [...new Set([checkDomain(primary), ...aliases.filter((a) => a.trim()).map(checkDomain)])];
    if (all.length > 20) throw new BadRequestException('A site can have up to 20 addresses');
    const taken = await this.domains.find({ where: { domain: In(all) } });
    const clash = taken.find((d) => d.siteId !== ownSiteId);
    if (clash) throw new ConflictException(`${clash.domain} is already used by another site`);
    return all;
  }

  async create(name: string, domains: string[], ssl: boolean, adminLang: AdminLang = '', printDesigner = false) {
    const site = await this.dataSource.transaction(async (m) => {
      const s = await m.save(
        m.create(Site, {
          name: name.trim().slice(0, 120) || domains[0],
          adminLang,
          printDesigner,
          sslMode: ssl ? 'requested' : 'off',
          ssl: ssl ? 'queued' : 'none',
          domains: domains.map((domain, i) => m.create(SiteDomain, { domain, primary: i === 0 })),
        }),
      );
      return s;
    });
    this.forget();
    if (ssl) await this.event(site.id, 'queued', 'ok', 'Waiting for the domains agent');
    return this.get(site.id);
  }

  /** Replaces the site's addresses. A site with a certificate gets a new one covering the new list. */
  async setDomains(id: string, primary: string, aliases: string[]) {
    const site = await this.get(id);
    const list = await this.checkDomains(primary, aliases, id);
    const before = toContext(site).domains.join(' ');
    await this.dataSource.transaction(async (m) => {
      await m.delete(SiteDomain, { siteId: id });
      await m.save(list.map((domain, i) => m.create(SiteDomain, { siteId: id, domain, primary: i === 0 })));
    });
    this.forget();
    if (site.sslMode === 'requested' && before !== list.join(' ')) await this.requestSsl(id, 'The addresses changed');
    return this.get(id);
  }

  async rename(id: string, name: string) {
    await this.get(id);
    await this.sites.update(id, { name: name.trim().slice(0, 120) });
    this.forget();
    return this.get(id);
  }

  async setAdminLang(id: string, adminLang: AdminLang) {
    await this.get(id);
    await this.sites.update(id, { adminLang });
    this.forget();
    return this.get(id);
  }

  /** Allows or stops the sublimation designer on the site. */
  async setPrintDesigner(id: string, printDesigner: boolean) {
    await this.get(id);
    await this.sites.update(id, { printDesigner });
    this.forget();
    return this.get(id);
  }

  /** Lets the site's admins manage its SEO, sitemap and robots.txt, or keeps that to the owners. */
  async setSeoAllowed(id: string, seoAllowed: boolean) {
    await this.get(id);
    await this.sites.update(id, { seoAllowed });
    this.forget();
    return this.get(id);
  }

  /** The owner asks for a certificate (first time, again after a failure, or a renewal now). */
  async requestSsl(id: string, why = 'Requested by the owner') {
    await this.get(id);
    await this.sites.update(id, { sslMode: 'requested', ssl: 'queued', sslMessage: '', sslAttempts: 0, sslRetryAt: null });
    await this.event(id, 'queued', 'ok', why);
    this.forget();
    return this.get(id);
  }

  /** No certificate any more: the agent switches the site to plain HTTP. The certificate files are left alone. */
  async turnOffSsl(id: string) {
    await this.get(id);
    await this.sites.update(id, { sslMode: 'off', ssl: 'none', sslMessage: '', sslAttempts: 0, sslRetryAt: null });
    await this.event(id, 'removed', 'ok', 'SSL turned off by the owner; the site is served over HTTP');
    this.forget();
    return this.get(id);
  }

  async event(siteId: string, step: SslStep, state: SslStepState, message = '') {
    await this.events.save(this.events.create({ siteId, step, state, message: message.slice(0, 4000) }));
  }

  async listEvents(siteId: string, limit = 60) {
    return this.events.find({ where: { siteId }, order: { createdAt: 'DESC' }, take: limit });
  }

  /** The agent finished (or failed) a certificate job. */
  async finishSsl(id: string, ok: boolean, message: string, expires?: string | null) {
    const site = await this.get(id);
    if (ok) {
      await this.sites.update(id, {
        ssl: 'active',
        sslMessage: message,
        sslAttempts: 0,
        sslRetryAt: null,
        ...(expires ? { sslExpires: new Date(expires) } : {}),
      });
    } else {
      const attempts = site.sslAttempts + 1;
      const wait = RETRY_MINUTES[attempts - 1];
      await this.sites.update(id, {
        ssl: 'failed',
        sslMessage: message,
        sslAttempts: attempts,
        sslRetryAt: wait ? new Date(Date.now() + wait * 60_000) : null,
      });
    }
    this.forget();
  }

  /**
   * The agent reports the certificates it finds on the server. A later expiry date than we knew means certbot
   * renewed it (Oblivion's certbot does that by itself), which goes into the site's timeline.
   */
  async certificateSeen(name: string, expires: Date) {
    const row = await this.domains.findOneBy({ domain: normalizeDomain(name), primary: true });
    if (!row) return;
    const site = await this.get(row.siteId);
    if (site.sslMode !== 'requested') return;
    const known = site.sslExpires?.getTime() ?? 0;
    if (Math.abs(expires.getTime() - known) < 60_000) return;
    await this.sites.update(site.id, { sslExpires: expires });
    if (known && expires.getTime() > known) {
      await this.event(site.id, 'renewed', 'ok', `Certificate renewed; valid until ${expires.toISOString().slice(0, 10)}`);
    }
  }

  /**
   * A new preview site, online until `days` from now: the owners' own at <PREVIEW_URL>/preview/<slug>, or, with
   * `hostId`, one made by that site's admins, under that site's address.
   */
  async createPreview(
    name: string,
    slug: string,
    days: number,
    prospect: string,
    adminLang: AdminLang = '',
    hostId: string | null = null,
    printDesigner = false,
  ) {
    if (!hostId && !config.previewUrl) throw new BadRequestException('Preview sites are off: set PREVIEW_URL (e.g. https://profiterol.ir)');
    const previewSlug = checkPreviewSlug(slug);
    if (await this.sites.existsBy({ previewSlug })) throw new ConflictException(`The preview name "${previewSlug}" is taken`);
    const site = await this.sites.save(
      this.sites.create({
        name: name.trim().slice(0, 120) || previewSlug,
        adminLang,
        preview: true,
        previewSlug,
        expiresAt: new Date(Date.now() + days * 86_400_000),
        prospect: prospect.slice(0, 2000),
        previewHostId: hostId,
        printDesigner,
        domains: [],
      }),
    );
    this.forget();
    return this.get(site.id);
  }

  /** Moves the end of a preview: `days` more from its current end (or from now, once it has ended). */
  async extendPreview(id: string, days: number) {
    const site = await this.get(id);
    if (!site.preview) throw new BadRequestException('This is not a preview site');
    const from = Math.max(Date.now(), site.expiresAt?.getTime() ?? Date.now());
    await this.sites.update(id, { expiresAt: new Date(from + days * 86_400_000) });
    this.forget();
    return this.get(id);
  }

  /** Sets when a preview ends; a time in the past ends it now. */
  async setPreviewEnd(id: string, expiresAt: Date) {
    const site = await this.get(id);
    if (!site.preview) throw new BadRequestException('This is not a preview site');
    await this.sites.update(id, { expiresAt });
    this.forget();
    return this.get(id);
  }

  async setProspect(id: string, prospect: string) {
    await this.get(id);
    await this.sites.update(id, { prospect: prospect.slice(0, 2000) });
    return this.get(id);
  }

  /**
   * The customer bought it: the preview becomes a normal site with its own addresses, keeping its content and
   * accounts. The preview name stays reserved, so its old links redirect to the new address.
   */
  async convertPreview(id: string, primary: string, aliases: string[], ssl: boolean) {
    const site = await this.get(id);
    if (!site.preview) throw new BadRequestException('This is not a preview site');
    const list = await this.checkDomains(primary, aliases, id);
    await this.dataSource.transaction(async (m) => {
      await m.save(list.map((domain, i) => m.create(SiteDomain, { siteId: id, domain, primary: i === 0 })));
      await m.update(Site, id, { preview: false, expiresAt: null, convertRequest: null });
    });
    this.forget();
    if (ssl) return this.requestSsl(id, 'The preview became a real site');
    return this.get(id);
  }

  /** The previews a site's admins made (newest first). */
  hostedPreviews(hostId: string) {
    return this.sites.find({ where: { previewHostId: hostId, preview: true }, order: { createdAt: 'DESC' }, relations: SITE_RELATIONS });
  }

  /** How many of a site's previews are online now (ended ones do not count against its limit). */
  async livePreviewCount(hostId: string) {
    return (await this.hostedPreviews(hostId)).filter((p) => !previewExpired(p)).length;
  }

  /** The owner lets a site's admins make previews (or stops them), and sets their limits. */
  async setPreviewRules(id: string, rules: { allowed?: boolean; max?: number; maxDays?: number }) {
    const site = await this.get(id);
    if (site.preview) throw new BadRequestException('A preview cannot make previews');
    await this.sites.update(id, {
      ...(rules.allowed !== undefined ? { previewsAllowed: rules.allowed } : {}),
      ...(rules.max !== undefined ? { previewMax: rules.max } : {}),
      ...(rules.maxDays !== undefined ? { previewMaxDays: rules.maxDays } : {}),
    });
    this.forget();
    return this.get(id);
  }

  /** The preview's maker asks the owners to move it to the customer's address (or withdraws the request). */
  async requestConversion(id: string, domain: string | null) {
    const site = await this.get(id);
    if (!site.preview) throw new BadRequestException('This is not a preview site');
    await this.sites.update(id, { convertRequest: domain ? checkDomain(domain) : null });
    return this.get(id);
  }

  /** Previews that ended more than `graceDays` ago. */
  async endedPreviews(graceDays: number) {
    const before = new Date(Date.now() - graceDays * 86_400_000);
    return this.sites.find({ where: { preview: true, expiresAt: LessThan(before) } });
  }

  async remove(id: string) {
    await this.sites.delete(await this.get(id).then((s) => s.id));
    this.forget();
    this.log.log(`Deleted site ${id}`);
  }
}
