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
