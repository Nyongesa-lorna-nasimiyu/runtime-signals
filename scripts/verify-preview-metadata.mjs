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

function value(html, pattern) {
  return html.match(pattern)?.[1]?.trim() ?? '';
}

const failures = [];
const pages = htmlFiles(DIST);
const metadata = [];

if (pages.length === 0) {
  console.error(`No HTML files found under ${DIST}/ - did the build run first?`);
  process.exit(1);
}

for (const file of pages) {
  const html = readFileSync(file, 'utf-8');

  // 404 is intentionally exempt from canonical/OG requirements - it has no
  // single canonical identity to describe.
  if (file.endsWith('404.html')) continue;

  const route = `/${file
    .replace(`${DIST}/`, '')
    .replaceAll('\\', '/')
    .replace(/index\.html$/, '')}`;
  const isArticle = /^\/(articles|brief)\/[^/]+\/?$/.test(route);

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
  check(html, /<meta name="twitter:title" content="[^"]+"/, 'twitter:title', failures, file);
  check(
    html,
    /<meta name="twitter:description" content="[^"]+"/,
    'twitter:description',
    failures,
    file,
  );
  check(html, /<h1\b/, '<h1>', failures, file);

  const title = value(html, /<title>([^<]*)<\/title>/);
  const description = value(html, /<meta name="description" content="([^"]*)"/);
  const canonical = value(html, /<link rel="canonical" href="([^"]*)"/);
  const ogType = value(html, /<meta property="og:type" content="([^"]*)"/);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (title.length > 70) failures.push(`${file}: title is ${title.length} characters (maximum 70)`);
  if (h1Count !== 1) failures.push(`${file}: expected exactly one <h1>, found ${h1Count}`);
  if (!canonical.startsWith('https://runtimesignals.tech/')) {
    failures.push(`${file}: canonical must use https://runtimesignals.tech`);
  }
  const expectedOgType = isArticle ? 'article' : 'website';
  if (ogType !== expectedOgType) {
    failures.push(`${file}: expected og:type=${expectedOgType}, found ${ogType || 'missing'}`);
  }

  const jsonLd = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ].flatMap((match) => {
    try {
      return [JSON.parse(match[1])];
    } catch {
      failures.push(`${file}: invalid JSON-LD`);
      return [];
    }
  });
  const jsonLdTypes = new Set(jsonLd.map((entry) => entry['@type']));
  if (!jsonLdTypes.has('WebSite')) failures.push(`${file}: JSON-LD is missing WebSite`);
  if (isArticle) {
    const article = jsonLd.find((entry) => entry['@type'] === 'Article');
    if (!article) failures.push(`${file}: article page is missing Article JSON-LD`);
    else if (!article.image) failures.push(`${file}: Article JSON-LD is missing image`);
    if (!jsonLdTypes.has('BreadcrumbList')) {
      failures.push(`${file}: article page is missing BreadcrumbList JSON-LD`);
    }
  }

  metadata.push({ file, title, description });
  check(
    html,
    /<script type="application\/ld\+json"[^>]*>[^<]*"@context"/,
    'JSON-LD with @context',
    failures,
    file,
  );
}

const duplicateTitles = new Map();
for (const page of metadata) {
  const files = duplicateTitles.get(page.title) ?? [];
  files.push(page.file);
  duplicateTitles.set(page.title, files);
}
for (const [title, files] of duplicateTitles) {
  if (files.length > 1) failures.push(`duplicate <title> "${title}": ${files.join(', ')}`);
}

if (failures.length > 0) {
  console.error(`Metadata verification FAILED on ${failures.length} issue(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `Metadata verified across ${pages.length} pages (title, description, canonical, OG, JSON-LD).`,
);
