// Shared helpers for the browser tests. Run them with `npm run e2e` (see e2e/README.md).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const sharp = require('sharp');

export const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
export const API = process.env.API_URL ?? `${BASE}/api`;
export const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'admin12345' };

/**
 * Each suite acts as its own visitor address (X-Forwarded-For, trusted from localhost), so the per-visitor limits
 * on forms and sign-ins do not carry over from one suite to the next.
 */
const visitor = `203.0.113.${1 + Math.floor(Math.random() * 250)}`;

const OUT = new URL('./.output/', import.meta.url).pathname;
const FIXTURES = `${OUT}fixtures/`;
mkdirSync(FIXTURES, { recursive: true });

/** A folder for a suite's screenshots: e2e/.output/<name>/ (not committed). */
export function shots(name) {
  const dir = `${OUT}${name}/`;
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------- Results ----------
let failed = 0;
export const errors = [];
export function check(name, ok, extra = '') {
  if (!ok) failed++;
  console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : extra);
}

/** Network noise from sandboxes without internet access (web fonts, map tiles, video embeds). */
const OFFLINE = /ERR_CERT|fonts\.g|ERR_TUNNEL|ERR_CONNECTION|ERR_BLOCKED|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/;

/** Records page errors and console errors (except offline noise and the patterns a suite expects). */
export function watch(page, expected = null) {
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !OFFLINE.test(t) && !(expected && expected.test(t))) errors.push(`console: ${t}`);
  });
  return page;
}

/** Prints the error summary and sets the exit code; call at the end of every suite. */
export function finish() {
  console.log('errors:', errors.length ? errors : 'none');
  if (failed || errors.length) process.exitCode = 1;
}


export async function launch() {
  const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const withVisitor = (opts = {}) => ({ ...opts, extraHTTPHeaders: { 'x-forwarded-for': visitor, ...opts.extraHTTPHeaders } });
  const newContext = browser.newContext.bind(browser);
  const newPage = browser.newPage.bind(browser);
  browser.newContext = (opts) => newContext(withVisitor(opts));
  browser.newPage = (opts) => newPage(withVisitor(opts));
  return browser;
}

export async function adminLogin(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', ADMIN.email);
  await page.fill('input[type=password]', ADMIN.password);
  await page.click('button[type=submit]');
  await page.waitForURL(`${BASE}/admin`);
}

// ---------- API ----------
export async function apiToken() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': visitor },
    body: JSON.stringify(ADMIN),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  return (await res.json()).token;
}

export async function api(token, method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

/** Uploads a buffer to the media library and returns its URL. */
export async function upload(token, bytes, name, type) {
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type }), name);
  const res = await fetch(`${API}/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: fd });
  if (!res.ok) throw new Error(`upload ${name}: ${res.status} ${await res.text()}`);
  return (await res.json()).url;
}

// ---------- Generated sample files (so the tests need no outside assets) ----------
const esc = (s) => String(s).replace(/[<&>]/g, (c) => `&#${c.charCodeAt(0)};`);

/** A soft two-color photo-like picture with an optional big label. */
export function photo({ width = 1600, height = 1000, from = '#00a998', to = '#c49a6c', label = '', format = 'jpeg' } = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
    <radialGradient id="l" cx="0.3" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#l)"/>
    <circle cx="${width * 0.72}" cy="${height * 0.62}" r="${Math.min(width, height) * 0.22}" fill="#fff" fill-opacity="0.12"/>
    ${label ? `<text x="50%" y="54%" font-family="sans-serif" font-size="${Math.round(Math.min(width, height) / 7)}" font-weight="900" fill="#fff" fill-opacity="0.85" text-anchor="middle">${esc(label)}</text>` : ''}
  </svg>`;
  const img = sharp(Buffer.from(svg));
  return (format === 'png' ? img.png() : format === 'webp' ? img.webp({ quality: 82 }) : img.jpeg({ quality: 82 })).toBuffer();
}

/** A person-shaped cut-out on a transparent background (for spotlight side cards). */
export function cutout({ width = 700, height = 1000, color = '#231f20' } = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <circle cx="${width / 2}" cy="${height * 0.3}" r="${width * 0.18}" fill="${color}"/>
    <path d="M ${width * 0.15} ${height} Q ${width * 0.15} ${height * 0.52} ${width / 2} ${height * 0.52} Q ${width * 0.85} ${height * 0.52} ${width * 0.85} ${height} Z" fill="${color}"/>
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer();
}

/** A word on a transparent background, e.g. a client or person logo. */
export function logo(text, { width = 480, height = 160, color = '#231f20', vertical = false } = {}) {
  const [w, h] = vertical ? [height, width] : [width, height];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="${Math.round(height * 0.45)}" fill="${color}"
      ${vertical ? `transform="rotate(-90 ${w / 2} ${h / 2})"` : ''}>${esc(text)}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** A short silent test video (needs ffmpeg; returns null without it). */
export function testVideo() {
  const path = `${FIXTURES}clip.webm`;
  if (existsSync(path)) return path;
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=24', '-t', '15', '-an', '-c:v', 'libvpx-vp9', '-b:v', '300k', '-deadline', 'realtime', '-cpu-used', '8', path]);
    return path;
  } catch {
    return null;
  }
}

/** Files used by the editor tests, written once to e2e/.output/fixtures/. */
export const fixtures = {
  cover: `${FIXTURES}cover-harbor.png`,
  gallery: `${FIXTURES}gallery-1.png`,
  fakeFont: `${FIXTURES}fake.woff2`,
  font: new URL('../node_modules/@mdi/font/fonts/materialdesignicons-webfont.woff2', import.meta.url).pathname,
};
if (!existsSync(fixtures.cover)) writeFileSync(fixtures.cover, await photo({ width: 1400, height: 900, from: '#0f4c5c', to: '#00a998', label: 'Harbor', format: 'png' }));
if (!existsSync(fixtures.gallery)) writeFileSync(fixtures.gallery, await photo({ width: 1200, height: 900, from: '#c49a6c', to: '#231f20', label: 'Studio', format: 'png' }));
writeFileSync(fixtures.fakeFont, 'this is not a font');
