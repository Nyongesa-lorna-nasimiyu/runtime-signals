// A dependency-free frontmatter status scanner for use in astro.config.mjs, which
// runs before Astro's content layer exists - `astro:content` isn't importable
// there, so this reads status/noindex directly off the frontmatter block instead
// of duplicating the full zod schema. It only needs to answer one narrow question
// ("should this URL be excluded from the sitemap?"), not validate content.
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

function frontmatterBlock(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : '';
}

function isArchivedOrNoindex(frontmatter) {
  if (/^status:\s*archived\s*$/m.test(frontmatter)) return true;
  if (/noindex:\s*true\s*$/m.test(frontmatter)) return true;
  return false;
}

function frontmatterField(frontmatter, field) {
  // \s* before the field name tolerates a nested block's indentation (e.g.
  // seo:'s "  description: ..." line) as well as top-level unindented
  // fields - both are real callers (see readFullEditorialRecords).
  const match = frontmatter.match(new RegExp(`^[ \\t]*${field}:\\s*(.+?)\\s*$`, 'm'));
  return match ? match[1].replace(/^["']|["']$/g, '') : undefined;
}

function bodyAfterFrontmatter(source) {
  const match = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return match ? match[1] : source;
}

/**
 * Returns the set of route paths (e.g. "/articles/foo") that must never appear in
 * the sitemap: internal utility pages, archived content (kept routable for its
 * stable URL per docs/architecture/content-model.md, but never promoted), and
 * anything explicitly marked seo.noindex.
 */
export function excludedSitemapPaths(contentRoot = 'src/content') {
  const excluded = new Set(['/search', '/newsletter']);
  const collections = [
    ['articles', '/articles'],
    ['briefs', '/brief'],
  ];
  for (const [dir, urlPrefix] of collections) {
    let files = [];
    try {
      files = readdirSync(join(contentRoot, dir));
    } catch {
      continue;
    }
    for (const file of files) {
      if (!['.md', '.mdx'].includes(extname(file))) continue;
      const id = file.slice(0, -extname(file).length);
      const source = readFileSync(join(contentRoot, dir, file), 'utf-8');
      if (isArchivedOrNoindex(frontmatterBlock(source))) {
        excluded.add(`${urlPrefix}/${id}`);
      }
    }
  }
  return excluded;
}

/**
 * Every article/brief's status and published_at, read directly off
 * frontmatter for the same reason excludedSitemapPaths does: this runs in
 * scripts/ci/run-scheduled-publish.mjs, outside Astro's content layer, and
 * only needs two fields, not full schema validation.
 */
export function readEditorialRecords(contentRoot = 'src/content') {
  const records = [];
  const collections = ['articles', 'briefs'];
  for (const dir of collections) {
    let files = [];
    try {
      files = readdirSync(join(contentRoot, dir));
    } catch {
      continue;
    }
    for (const file of files) {
      if (!['.md', '.mdx'].includes(extname(file))) continue;
      const id = file.slice(0, -extname(file).length);
      const source = readFileSync(join(contentRoot, dir, file), 'utf-8');
      const frontmatter = frontmatterBlock(source);
      const status = frontmatterField(frontmatter, 'status');
      const publishedAtRaw = frontmatterField(frontmatter, 'published_at');
      if (!status || !publishedAtRaw) continue;
      records.push({ key: `${dir}/${id}`, status, published_at: new Date(publishedAtRaw) });
    }
  }
  return records;
}

/**
 * Title, dek, seo.description, claims (evidence only), and body text for
 * every article/brief - what scripts/ci/run-editorial-report.mjs needs to
 * compute SEO previews, duplicate-coverage checks, internal-link
 * suggestions, and citation coverage. Not a full schema read (no authors,
 * topics, series, sources) - only the fields that report actually uses.
 */
export function readFullEditorialRecords(contentRoot = 'src/content') {
  const records = [];
  const collections = [
    ['articles', 'articles', '/articles'],
    ['briefs', 'briefs', '/brief'],
  ];
  for (const [dir, keyPrefix, urlPrefix] of collections) {
    let files = [];
    try {
      files = readdirSync(join(contentRoot, dir));
    } catch {
      continue;
    }
    for (const file of files) {
      if (!['.md', '.mdx'].includes(extname(file))) continue;
      const id = file.slice(0, -extname(file).length);
      const source = readFileSync(join(contentRoot, dir, file), 'utf-8');
      const frontmatter = frontmatterBlock(source);
      const title = frontmatterField(frontmatter, 'title');
      if (!title) continue;
      const seoBlockMatch = frontmatter.match(/^seo:\n((?:[ \t]+.+\n?)*)/m);
      const seoDescription = seoBlockMatch
        ? frontmatterField(seoBlockMatch[1], 'description')
        : undefined;
      const claims = [...frontmatter.matchAll(/^\s*evidence:\s*(\w+)\s*$/gm)].map((m) => ({
        evidence: m[1],
      }));
      records.push({
        key: `${keyPrefix}/${id}`,
        title,
        dek: frontmatterField(frontmatter, 'dek') ?? '',
        seoDescription,
        claims,
        body: bodyAfterFrontmatter(source),
        path: `${urlPrefix}/${id}`,
      });
    }
  }
  return records;
}

/** Every topic's display name, for internal-link-suggestion candidates
 * alongside articles/briefs. Topics are plain YAML with no frontmatter
 * delimiter, so frontmatterField is applied to the raw file content. */
export function readTopicRecords(contentRoot = 'src/content') {
  const records = [];
  let files = [];
  try {
    files = readdirSync(join(contentRoot, 'topics'));
  } catch {
    return records;
  }
  for (const file of files) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
    const id = file.replace(/\.ya?ml$/, '');
    const source = readFileSync(join(contentRoot, 'topics', file), 'utf-8');
    const name = frontmatterField(source, 'name');
    if (!name) continue;
    records.push({ key: `topics/${id}`, title: name, path: `/topics/${id}` });
  }
  return records;
}
