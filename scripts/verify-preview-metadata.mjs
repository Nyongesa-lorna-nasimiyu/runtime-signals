#!/usr/bin/env node
// Black-box metadata check against the real dist/ output, same pattern as
// verify-draft-exclusion.mjs and verify-security-headers.mjs: read the
// actual generated HTML, not the source templates, so a bug in how a value
// gets threaded through to a page is caught the same way a real reviewer
// looking at rendered output would catch it. Run by pr-preview.yml as one of
// the three "preview validation" dimensions (metadata, accessibility,
// performance) alongside the existing a11y suite and
// verify-preview-performance.mjs.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

function htmlFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...htmlFiles(full));
    } else if (entry === 'index.html' || entry.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

function check(html, pattern, label, failures, file) {
  if (!pattern.test(html)) failures.push(`${file}: missing or empty ${label}`);
}

const failures = [];
const pages = htmlFiles(DIST);

if (pages.length === 0) {
  console.error(`No HTML files found under ${DIST}/ - did the build run first?`);
  process.exit(1);
}

for (const file of pages) {
  const html = readFileSync(file, 'utf-8');

  // 404 is intentionally exempt from canonical/OG requirements - it has no
  // single canonical identity to describe.
  if (file.endsWith('404.html')) continue;

  check(html, /<title>[^<]+<\/title>/, 'non-empty <title>', failures, file);
  check(
    html,
    /<meta name="description" content="[^"]+"/,
    'non-empty meta description',
    failures,
    file,
  );
  check(html, /<link rel="canonical" href="https?:\/\/[^"]+"/, 'canonical link', failures, file);
  check(html, /<meta property="og:title" content="[^"]+"/, 'og:title', failures, file);
  check(html, /<meta property="og:description" content="[^"]+"/, 'og:description', failures, file);
  check(html, /<meta property="og:image" content="https?:\/\/[^"]+"/, 'og:image', failures, file);
  check(
    html,
    /<script type="application\/ld\+json"[^>]*>[^<]*"@context"/,
    'JSON-LD with @context',
    failures,
    file,
  );
}

if (failures.length > 0) {
  console.error(`Metadata verification FAILED on ${failures.length} issue(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `Metadata verified across ${pages.length} pages (title, description, canonical, OG, JSON-LD).`,
);
