import { AsyncLocalStorage } from 'node:async_hooks';
import { NotFoundException } from '@nestjs/common';

/** The site a request is for, picked from its address (see SitesService.resolve). */
export interface SiteContext {
  id: string;
  name: string;
  /** The main address, e.g. example.com; links, canonical URLs and emails use it. */
  primary: string;
  /** Every address of the site, the primary first. */
  domains: string[];
  /** Whether the site has a working certificate, so links can use https. */
  https: boolean;
  /** The admin panel's language for people who have not picked one ('' follows their browser). */
  adminLang: '' | 'en' | 'fa';
  /** Whether the owner has allowed the sublimation designer (and its Print orders) on this site. */
  printDesigner: boolean;
  /** Whether the owner lets the site's admins manage its SEO, sitemap and robots.txt (owners always can). */
  seoAllowed: boolean;
  /**
   * The port the request came in on, when its address had one (development, e.g. localhost:8080). Behind nginx
   * there is none. Links in emails keep it, so they work where the admin is running.
   */
  port?: string;
  /**
   * For a preview site: the path it is served under, e.g. /preview/ali-shop ('' for every other site). Its links,
   * cookies and emails stay inside it.
   */
  prefix: string;
  /** The address that path is on: PREVIEW_URL, or the address of the site that made the preview. */
  prefixBase: string;
  /**
   * For a preview site: when it ends (ISO date), whether it already has, the address of whoever made it (for
   * "keep this site"), and the site that made it (null for the owners' own previews).
   */
  preview: { expiresAt: string | null; expired: boolean; home: string; hostId: string | null } | null;
  /** For a site whose admins may make previews (the owner allows it): how many at once, and for how long. */
  hostsPreviews: { max: number; maxDays: number } | null;
  /** Set when a request comes in under the old path of a preview that became a real site: its new address. */
  movedTo?: string;
}

const store = new AsyncLocalStorage<SiteContext>();

/**
 * The current request's site. Every query for site content filters on its id, so one site's pages, media, users and
 * settings never show on another. Throws when there is none, so a query can never silently run across all sites.
 */
export function currentSite(): SiteContext {
  const site = store.getStore();
  if (!site) throw new NotFoundException('No site at this address');
  return site;
}

export const currentSiteId = () => currentSite().id;

/** The current site, or undefined outside a request for one (internal routes, background jobs). */
export const maybeSite = () => store.getStore();

/** Runs `work` as if it were a request for `site`: used by the scheduler, the seed and new-site setup. */
export function runInSite<T>(site: SiteContext, work: () => T): T {
  return store.run(site, work);
}

/** https://example.com, for links in emails and absolute URLs (with the request's port, in development). */
export function siteOrigin(site: SiteContext = currentSite()) {
  const port = site.port ?? maybeSite()?.port;
  // A preview's address is a path on another site's, e.g. https://profiterol.ir/preview/ali-shop.
  if (site.prefix) return `${site.prefixBase}${port && !/:\d+$/.test(site.prefixBase) ? `:${port}` : ''}${site.prefix}`;
  return `${site.https ? 'https' : 'http'}://${site.primary}${port ? `:${port}` : ''}`;
}
