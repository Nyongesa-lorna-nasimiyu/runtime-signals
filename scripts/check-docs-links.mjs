#!/usr/bin/env node
// Internal-link validation for docs/ and README.md. Prettier is deliberately kept
// off the hand-formatted research tables in docs/ (.prettierignore), but that
// doesn't mean the decision pack should sit completely outside quality checks —
// tracked as a gap by external review of Phase 2 checkpoint 1. This checks the one
// thing that silently rots fastest as docs get renamed/moved: relative markdown
// links pointing at a file that no longer exists.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOTS = ['docs', 'README.md'];
const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

function walk(path) {
  const stat = statSync(path);
  if (stat.isFile()) return path.endsWith('.md') ? [path] : [];
  const out = [];
  for (const entry of readdirSync(path)) {
    out.push(...walk(join(path, entry)));
  }
  return out;
}

const files = ROOTS.filter(existsSync).flatMap(walk);
let brokenLinks = [];

for (const file of files) {
  const source = readFileSync(file, 'utf-8');
  for (const match of source.matchAll(LINK_RE)) {
    let target = match[1].trim();
    if (/^([a-z]+:)?\/\//i.test(target) || target.startsWith('mailto:')) continue; // external
    target = target.split('#')[0].trim(); // drop in-page anchors
    if (target === '') continue; // pure anchor link
    const resolved = resolve(dirname(file), target);
    if (!existsSync(resolved)) {
      brokenLinks.push({ file, target });
    }
  }
}

if (brokenLinks.length > 0) {
  console.error(`Broken internal link(s) in docs/ or README.md:`);
  for (const { file, target } of brokenLinks) {
    console.error(`  ${file}: -> "${target}" does not resolve to an existing file`);
  }
  process.exit(1);
}

console.log(
  `Checked ${files.length} markdown file(s) in docs/ and README.md. No broken internal links.`,
);
