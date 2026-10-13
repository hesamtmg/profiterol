import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { mergeMap } from 'rxjs';
import { config } from '../config';
import { maybeSite } from '../sites/site-context';

const log = new Logger('PageCache');

/**
 * Asks the web app to forget its rendered pages for these addresses (one site's), or all of them. Never fails the
 * change that caused it.
 */
export async function purgePageCache(hosts?: string[]) {
  if (!config.cachePurgeToken) return;
  try {
    const res = await fetch(`${config.webInternalUrl}/_cache/purge`, {
      method: 'POST',
      headers: { 'x-purge-token': config.cachePurgeToken, 'content-type': 'application/json' },
      body: JSON.stringify(hosts ? { hosts } : {}),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) log.warn(`The web app answered ${res.status} to a cache purge`);
  } catch (err) {
    log.warn(`Could not clear the page cache: ${err}`);
  }
}

/**
 * Any successful change made through the admin API may change what the site shows. The answer waits for the
 * purge (of that site's pages), so a page opened right after "Publish" is already the new one.
 */
@Injectable()
export class PurgeOnChangeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request>();
    const changes = req.method !== 'GET' && req.method !== 'HEAD' && req.path.startsWith('/api/admin/');
    if (!changes) return next.handle();
    const site = maybeSite();
    return next.handle().pipe(
      mergeMap(async (value) => {
        await purgePageCache(site?.domains);
        return value;
      }),
    );
  }
}
