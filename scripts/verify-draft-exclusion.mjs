#!/usr/bin/env node
// Black-box draft/future/unapproved-content exclusion check against the REAL build
// output in dist/ - not a mock. Run after `npm run build`. This is the concrete
// "draft-leak test" the Phase 2 checkpoint calls for: it inspects what actually got
// written to disk, not what the source code claims it does.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

const mustExist = [
  [
    'articles/model-handoff-as-distributed-state-transfer/index.html',
    'published + approved article',
  ],
  [
    'articles/archived-early-agent-framework-notes/index.html',
    'archived article (keeps its stable URL)',
  ],
  ['brief/first-briefing/index.html', 'published + approved brief'],
];

const mustNotExist = [
  ['articles/retry-storms-and-idempotency-keys/index.html', 'draft article'],
  ['articles/future-piece-not-yet-due/index.html', 'scheduled article, not yet due'],
  [
    'articles/unapproved-but-scheduled-past-due/index.html',
    'scheduled + past due, but unapproved article',
  ],
];

let failures = [];

for (const [rel, label] of mustExist) {
  if (!existsSync(join(DIST, rel))) failures.push(`MISSING (should exist): ${rel} - ${label}`);
}
for (const [rel, label] of mustNotExist) {
  if (existsSync(join(DIST, rel))) failures.push(`LEAKED (must not exist): ${rel} - ${label}`);
}

// The archived piece must drop out of the active listing, home feed, RSS, Atom, AND
// the sitemap - even though its own page still exists. The sitemap check was
// previously missing entirely: this script claimed sitemap exclusion without ever
// having checked it, and @astrojs/sitemap crawls every emitted route by default, so
// the archived article was actually leaking into the real sitemap. Caught by
// external review, not by this script - fixed by actually checking it now.
const surfacesThatMustExcludeArchived = [
  'articles/index.html',
  'index.html',
  'rss.xml',
  'atom.xml',
  'sitemap-0.xml',
];
for (const rel of surfacesThatMustExcludeArchived) {
  const p = join(DIST, rel);
  if (!existsSync(p)) {
    failures.push(`MISSING surface to check: ${rel}`);
    continue;
  }
  const html = readFileSync(p, 'utf-8');
  if (html.includes('archived-early-agent-framework-notes')) {
    failures.push(`LEAKED into listing: ${rel} references the archived article`);
  }
  for (const [rel2] of mustNotExist) {
    const id = rel2.split('/')[1];
    if (html.includes(id)) {
      failures.push(`LEAKED into listing: ${rel} references excluded content "${id}"`);
    }
  }
}

// Internal tools and unfinished pages should remain reachable for users, but
// must not compete with editorial URLs in search indexes or the sitemap.
const noindexUtilityPages = [
  ['search/index.html', '/search'],
  ['newsletter/index.html', '/newsletter'],
];
for (const [rel, route] of noindexUtilityPages) {
  const p = join(DIST, rel);
  if (!existsSync(p)) {
    failures.push(`MISSING noindex utility page: ${rel}`);
    continue;
  }
  const html = readFileSync(p, 'utf-8');
  if (!/<meta name="robots" content="noindex, nofollow"/.test(html)) {
    failures.push(`MISSING noindex directive: ${route}`);
  }
}

// Editorial URLs have source-controlled publication/revision dates. The
// sitemap must carry those dates, while utility/listing/source URLs may remain
// without lastmod because this build has no honest modification event for them.
const sitemapPath = join(DIST, 'sitemap-0.xml');
if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, 'utf-8');
  const sitemapEntries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  const expectedEditorialLastmods = new Map([
    [
      'https://runtimesignals.tech/articles/model-handoff-as-distributed-state-transfer',
      '2026-08-29T00:00:00.000Z',
    ],
    [
      'https://runtimesignals.tech/articles/tool-results-are-data-not-authority',
      '2026-08-29T12:00:00.000Z',
    ],
    ['https://runtimesignals.tech/brief/first-briefing', '2026-06-05T07:00:00.000Z'],
  ]);
  for (const loc of expectedEditorialLastmods.keys()) {
    if (!sitemapEntries.some((entry) => entry.includes(`<loc>${loc}</loc>`))) {
      failures.push(`MISSING expected editorial sitemap URL: ${loc}`);
    }
  }
  for (const entry of sitemapEntries) {
    const loc = entry.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '';
    if (/^https:\/\/runtimesignals\.tech\/(articles|brief)\//.test(loc)) {
      if (!/<lastmod>[^<]+<\/lastmod>/.test(entry)) {
        failures.push(`MISSING editorial sitemap lastmod: ${loc}`);
      }
      const expectedLastmod = expectedEditorialLastmods.get(loc);
      if (expectedLastmod && !entry.includes(`<lastmod>${expectedLastmod}</lastmod>`)) {
        failures.push(`INCORRECT editorial sitemap lastmod: ${loc}`);
      }
    }
  }
  for (const route of ['/search', '/newsletter']) {
    if (sitemap.includes(`<loc>https://runtimesignals.tech${route}</loc>`)) {
      failures.push(`LEAKED noindex utility into sitemap: ${route}`);
    }
  }
} else {
  failures.push(`MISSING surface to check: ${sitemapPath}`);
}

if (failures.length > 0) {
  console.error('Draft/future/unapproved/archived exclusion check FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `Draft-leak check passed: ${mustExist.length} expected routes exist, ${mustNotExist.length} excluded fixtures produced no route, and the archived fixture is absent from ${surfacesThatMustExcludeArchived.length} active-listing surfaces.`,
);
