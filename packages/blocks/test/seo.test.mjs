import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  articleJsonLd,
  breadcrumbJsonLd,
  cleanSeo,
  robotsTxt,
  seoTitle,
  sitemapIndexXml,
  sitemapXml,
  verificationMeta,
} from '../dist/esm/index.js';

test('cleanSeo keeps safe values only', () => {
  const seo = cleanSeo({
    titleTemplate: { en: '%s | Shop', fa: 'no placeholder', xx: '%s' },
    description: { en: '  Hand-made cups  ' },
    shareImage: 'javascript:alert(1)',
    twitter: '@my_shop!',
    verification: { google: 'abc_123-x"><script>', bing: 42 },
    robotsExtra: 'Disallow: /drafts\n<script>alert(1)</script>\nCrawl-delay: 5',
    hideSite: 'yes',
    evil: true,
  });
  assert.deepEqual(seo.titleTemplate, { en: '%s | Shop' });
  assert.deepEqual(seo.description, { en: 'Hand-made cups' });
  assert.equal(seo.shareImage, '');
  assert.equal(seo.twitter, 'my_shop');
  assert.deepEqual(seo.verification, { google: 'abc_123-xscript', bing: '', yandex: '', baidu: '' });
  assert.equal(seo.robotsExtra, 'Disallow: /drafts\nCrawl-delay: 5');
  assert.equal(seo.hideSite, false, 'only true hides the site');
  assert.equal(seo.collectionPages, true);
  assert.equal('evil' in seo, false);
  assert.equal(cleanSeo({ shareImage: '/uploads/a.jpg' }).shareImage, '/uploads/a.jpg');
});

test('titles follow the site pattern; the home page is the site name', () => {
  assert.equal(seoTitle({}, 'en', 'About', 'Shop'), 'About · Shop');
  assert.equal(seoTitle({ titleTemplate: { en: '%s — {site}' } }, 'en', 'About', 'Shop'), 'About — Shop');
  assert.equal(seoTitle({ titleTemplate: { en: '%s — {site}' } }, 'fa', 'درباره', 'فروشگاه'), 'درباره · فروشگاه');
  assert.equal(seoTitle({}, 'en', 'Shop', 'Shop'), 'Shop');
});

test('verification meta tags and robots.txt', () => {
  assert.deepEqual(verificationMeta({ verification: { google: 'g1', bing: '', yandex: 'y1', baidu: '' } }), [
    { name: 'google-site-verification', content: 'g1' },
    { name: 'yandex-verification', content: 'y1' },
  ]);
  const open = robotsTxt({ robotsExtra: 'Disallow: /drafts' }, 'https://a.com');
  assert.match(open, /Disallow: \/admin/);
  assert.match(open, /Disallow: \/drafts/);
  assert.match(open, /Sitemap: https:\/\/a\.com\/sitemap\.xml\n$/);
  assert.match(robotsTxt({ hideSite: true }, 'https://a.com'), /^User-agent: \*\nDisallow: \/\n/);
});

test('breadcrumbs and articles', () => {
  assert.equal(breadcrumbJsonLd([{ name: 'Home', url: 'https://a.com/en' }]), null, 'one crumb is not a trail');
  const crumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://a.com/en' },
    { name: 'Blog', url: 'https://a.com/en/blog' },
  ]);
  assert.equal(crumbs.itemListElement[1].position, 2);
  const article = articleJsonLd({
    type: 'BlogPosting',
    url: 'https://a.com/en/blog/hi',
    headline: 'Hi',
    description: '',
    image: '',
    locale: 'en',
    published: '2026-01-02T00:00:00Z',
    modified: null,
    author: 'Sara',
    publisher: 'A',
    origin: 'https://a.com',
  });
  assert.equal(article['@type'], 'BlogPosting');
  assert.equal(article.dateModified, '2026-01-02T00:00:00.000Z', 'modified falls back to published');
  assert.equal('description' in article, false, 'empty values are left out');
  assert.equal(article.author.name, 'Sara');
});

test('sitemaps: hreflang alternates, images and escaping', () => {
  const xml = sitemapXml([
    {
      loc: 'https://a.com/en/a&b',
      lastmod: '2026-01-01T00:00:00Z',
      alternates: [
        { hreflang: 'en', href: 'https://a.com/en/a&b' },
        { hreflang: 'x-default', href: 'https://a.com/en/a&b' },
      ],
      images: ['https://a.com/uploads/x.jpg', 'https://a.com/uploads/x.jpg'],
    },
  ]);
  assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.match(xml, /<loc>https:\/\/a\.com\/en\/a&#38;b<\/loc>/);
  assert.match(xml, /<xhtml:link rel="alternate" hreflang="x-default"/);
  assert.equal(xml.match(/<image:image>/g).length, 1, 'the same picture once');
  assert.match(
    sitemapIndexXml([{ loc: 'https://a.com/sitemap-pages.xml' }]),
    /<sitemapindex .*<loc>https:\/\/a\.com\/sitemap-pages\.xml<\/loc>/,
  );
});

test('public links use the main address, with the port the visitor used on it', async () => {
  const { publicOrigin } = await import('../dist/esm/index.js');
  assert.equal(publicOrigin('http://localhost', new URL('http://localhost:8080/en')), 'http://localhost:8080');
  assert.equal(publicOrigin('https://a.com', new URL('https://www.a.com/en')), 'https://a.com', 'aliases link to the main address');
  assert.equal(publicOrigin('', new URL('https://b.com:4443/en')), 'https://b.com:4443');
});
