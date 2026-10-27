import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { NextFunction, Request, Response } from 'express';
import { DataSource, In, Repository } from 'typeorm';
import { config } from '../config';
import { runInSite, type SiteContext } from './site-context';
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

export const toContext = (site: Site): SiteContext => {
  const sorted = [...site.domains].sort((a, b) => Number(b.primary) - Number(a.primary) || a.createdAt.getTime() - b.createdAt.getTime());
  return {
    id: site.id,
    name: site.name,
    adminLang: site.adminLang ?? '',
    printDesigner: site.printDesigner ?? false,
    primary: sorted[0]?.domain ?? '',
    domains: sorted.map((d) => d.domain),
    https: site.ssl === 'active' || (!!config.siteUrl.startsWith('https://') && new URL(config.siteUrl).hostname === sorted[0]?.domain),
  };
};

@Injectable()
export class SitesService {
  private readonly log = new Logger(SitesService.name);
  private cache = new Map<string, { site: SiteContext | null; at: number }>();
  private only: { site: SiteContext | null; at: number } | null = null;
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
      site = toContext(await this.sites.findOneByOrFail({ id: row.siteId }));
    } else {
      site = await this.onlySite();
    }
    if (this.cache.size > 1000) this.cache.clear();
    this.cache.set(domain, { site, at: Date.now() });
    return site;
  }

  private async onlySite(): Promise<SiteContext | null> {
    if (this.only && Date.now() - this.only.at < CACHE_MS) return this.only.site;
    const all = await this.sites.find({ take: 2 });
    this.only = { site: all.length === 1 ? toContext(all[0]) : null, at: Date.now() };
    return this.only.site;
  }

  /** Express middleware: runs the request as its site's request, or answers 404 for an address with no site. */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Health checks and the domains agent are not for any one site; uploads are served by file name.
      if (/^\/api\/(health|internal)(\/|$)|^\/uploads\//.test(req.path)) return next();
      const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '').split(',')[0];
      this.resolve(host).then(
        (site) => {
          if (!site) {
            res.status(404).json({ statusCode: 404, message: 'No site at this address' });
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
    const site = await this.sites.findOneBy({ id });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  async context(id: string) {
    return toContext(await this.get(id));
  }

  list() {
    return this.sites.find({ order: { createdAt: 'ASC' } });
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

  async remove(id: string) {
    await this.sites.delete(await this.get(id).then((s) => s.id));
    this.forget();
    this.log.log(`Deleted site ${id}`);
  }
}
