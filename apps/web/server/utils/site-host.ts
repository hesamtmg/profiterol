import type { H3Event } from 'h3';

/**
 * The site's address this request is for, e.g. example.com (lowercase, no port). One installation serves several
 * sites, and the API picks the site from this address, so it is passed on with every call (as X-Forwarded-Host).
 */
export function requestHost(event: H3Event): string {
  return getRequestURL(event, { xForwardedHost: true }).hostname.toLowerCase().replace(/\.$/, '');
}

/** `$fetch` options for an API call made on behalf of this request's site. */
export function siteFetchOptions(event: H3Event) {
  return { baseURL: useRuntimeConfig().apiInternal, headers: { 'x-forwarded-host': requestHost(event) } };
}
