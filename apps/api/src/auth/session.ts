import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';

/**
 * The admin signs in with a session cookie that page scripts cannot read (httpOnly), so a script injected into the
 * site cannot steal it. Because browsers send cookies on their own, every change made with that cookie must also
 * carry the `X-CSRF-Token` header, copied by the admin from the readable `pt_csrf` cookie (double-submit): another
 * site can make the browser send the cookie, but cannot read it to fill in the header.
 *
 * Scripts and API clients keep using `Authorization: Bearer <token>`, which browsers never send on their own.
 */
export const SESSION_COOKIE = 'pt_session';
export const CSRF_COOKIE = 'pt_csrf';
export const CSRF_HEADER = 'x-csrf-token';
export const SESSION_DAYS = 7;

const isHttps = (req: Request) => req.secure;

function options(req: Request, httpOnly: boolean): CookieOptions {
  return { httpOnly, secure: isHttps(req), sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 };
}

export function setSession(req: Request, res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, options(req, true));
  res.cookie(CSRF_COOKIE, randomBytes(24).toString('base64url'), options(req, false));
}

export function clearSession(req: Request, res: Response) {
  const { maxAge: _, ...base } = options(req, true);
  res.clearCookie(SESSION_COOKIE, base);
  res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false });
}

/** Safe methods change nothing, so they need no CSRF check. */
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfOk(req: Request): boolean {
  if (SAFE.has(req.method)) return true;
  const cookie = String(req.cookies?.[CSRF_COOKIE] ?? '');
  const header = String(req.headers[CSRF_HEADER] ?? '');
  if (!cookie || cookie.length !== header.length) return false;
  return timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
}

/** The session token from the Authorization header, or from the cookie (then flagged so CSRF is checked). */
export function readToken(req: Request): { token: string; fromCookie: boolean } | null {
  const [scheme, bearer] = (req.headers.authorization ?? '').split(' ');
  if (scheme === 'Bearer' && bearer) return { token: bearer, fromCookie: false };
  const cookie = req.cookies?.[SESSION_COOKIE];
  return cookie ? { token: String(cookie), fromCookie: true } : null;
}
