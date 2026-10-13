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

/** https://example.com, for links in emails and absolute URLs. */
export function siteOrigin(site: SiteContext = currentSite()) {
  return `${site.https ? 'https' : 'http'}://${site.primary}`;
}
