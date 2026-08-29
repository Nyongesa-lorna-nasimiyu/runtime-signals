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

if (failures.length > 0) {
  console.error('Draft/future/unapproved/archived exclusion check FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `Draft-leak check passed: ${mustExist.length} expected routes exist, ${mustNotExist.length} excluded fixtures produced no route, and the archived fixture is absent from ${surfacesThatMustExcludeArchived.length} active-listing surfaces.`,
);
