#!/usr/bin/env node
// Non-destructive production smoke check. This intentionally uses only public
// GET requests and no credentials, so it can run from a scheduled GitHub
// Actions job without becoming a deployment path or a data-access path.
import { writeFile } from 'node:fs/promises';

const origin = new URL(process.env.PRODUCTION_ORIGIN ?? 'https://runtimesignals.tech');
origin.pathname = origin.pathname.replace(/\/$/, '');
const hstsMinimum = Number(process.env.HSTS_MIN_AGE ?? '300');
const reportPath = process.env.HEALTH_REPORT_PATH;
const timeoutMs = Number(process.env.HEALTH_TIMEOUT_MS ?? '15000');

if (origin.protocol !== 'https:') {
  console.error(`Production origin must use HTTPS: ${origin.href}`);
  process.exit(1);
}

const checks = [
  { name: 'home', path: '/', status: 200, contentType: /text\/html/i },
  { name: 'robots', path: '/robots.txt', status: 200, contentType: /text\/plain/i },
  { name: 'sitemap index', path: '/sitemap-index.xml', status: 200, contentType: /xml/i },
  { name: 'sitemap shard', path: '/sitemap-0.xml', status: 200, contentType: /xml/i },
  { name: 'RSS feed', path: '/rss.xml', status: 200, contentType: /xml/i },
  { name: 'Atom feed', path: '/atom.xml', status: 200, contentType: /xml/i },
  {
    name: 'custom 404',
    path: '/.well-known/runtime-signals-phase5-missing',
    status: 404,
    contentType: /text\/html/i,
  },
  { name: 'trailing-slash redirect', path: '/about/', redirect: true },
];

function urlFor(path) {
  return new URL(path, origin).href;
}

async function request(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(urlFor(path), {
      redirect: 'manual',
      headers: { 'user-agent': 'runtime-signals-production-health/1.0' },
      signal: controller.signal,
    });
    return {
      status: response.status,
      location: response.headers.get('location') ?? '',
      contentType: response.headers.get('content-type') ?? '',
      headers: response.headers,
      body: await response.text(),
    };
  } finally {
    clearTimeout(timer);
  }
}

const failures = [];
const results = [];
let home;
let robots;
let sitemapIndex;

for (const check of checks) {
  let result;
  try {
    result = await request(check.path);
  } catch (error) {
    failures.push(`${check.name}: request failed (${error.message})`);
    continue;
  }

  results.push({
    name: check.name,
    path: check.path,
    status: result.status,
    location: result.location || undefined,
    contentType: result.contentType,
  });

  if (check.redirect) {
    const location = result.location ? new URL(result.location, origin) : null;
    if (
      ![301, 302, 307, 308].includes(result.status) ||
      !location ||
      location.origin !== origin.origin ||
      location.pathname.endsWith('/')
    ) {
      failures.push(
        `${check.name}: expected a same-origin redirect that removes the trailing slash`,
      );
    }
  } else {
    if (result.status !== check.status)
      failures.push(`${check.name}: expected HTTP ${check.status}, got ${result.status}`);
    if (check.contentType && !check.contentType.test(result.contentType)) {
      failures.push(`${check.name}: unexpected content type ${result.contentType || '(missing)'}`);
    }
  }

  if (check.name === 'home') home = result;
  if (check.name === 'robots') robots = result;
  if (check.name === 'sitemap index') sitemapIndex = result;
}

if (home) {
  const canonical = home.body.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] ?? '';
  if (canonical !== urlFor('/'))
    failures.push(`home: canonical is ${canonical || '(missing)'}, expected ${urlFor('/')}`);
  if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(home.body)) {
    failures.push('home: production page contains a noindex robots directive');
  }

  const requiredHeaders = {
    'x-content-type-options': /\bnosniff\b/i,
    'x-frame-options': /^SAMEORIGIN$/i,
    'referrer-policy': /^strict-origin-when-cross-origin$/i,
    'permissions-policy': /camera=\(\), geolocation=\(\), microphone=\(\)/i,
    'cross-origin-opener-policy': /^same-origin-allow-popups$/i,
    'content-security-policy': /frame-ancestors 'self'/i,
  };
  for (const [header, pattern] of Object.entries(requiredHeaders)) {
    const value = home.headers.get(header) ?? '';
    if (!pattern.test(value))
      failures.push(`home: ${header} is missing or unexpected (${value || 'missing'})`);
  }
  const hsts = home.headers.get('strict-transport-security') ?? '';
  const maxAge = Number(hsts.match(/max-age=(\d+)/i)?.[1] ?? '0');
  if (maxAge < hstsMinimum)
    failures.push(`home: HSTS max-age ${maxAge} is below required minimum ${hstsMinimum}`);
}

if (robots && !robots.body.includes(`Sitemap: ${urlFor('/sitemap-index.xml')}`)) {
  failures.push('robots: sitemap index URL is missing or not canonical');
}
if (sitemapIndex && !sitemapIndex.body.includes(`<loc>${urlFor('/sitemap-0.xml')}</loc>`)) {
  failures.push('sitemap index: expected canonical sitemap shard is missing');
}

const report = {
  origin: origin.href,
  checked_at: new Date().toISOString(),
  hsts_minimum: hstsMinimum,
  checks: results,
  failures,
};
if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
  console.error(`Production health verification FAILED (${failures.length} issue(s)):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Production health verified for ${origin.href} (${results.length} public checks).`);
