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
  const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+?)\\s*$`, 'm'));
  return match ? match[1].replace(/^["']|["']$/g, '') : undefined;
}

/**
 * Returns the set of route paths (e.g. "/articles/foo") that must never appear in
 * the sitemap: archived content (kept routable for its stable URL per
 * docs/architecture/content-model.md, but never promoted) and anything explicitly
 * marked seo.noindex.
 */
export function excludedSitemapPaths(contentRoot = 'src/content') {
  const excluded = new Set();
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
