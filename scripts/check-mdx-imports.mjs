#!/usr/bin/env node
// Enforces docs/security/threat-model.md's MDX mitigation: "Trusted-author boundary;
// Markdown default; allow-list components." Astro/MDX does not sandbox `import`
// statements inside .mdx content — anything importable in the project is
// importable from an .mdx file. So the boundary is a build-time allow-list check,
// not a runtime sandbox: only relative imports of the components explicitly
// exported from src/components/mdx/ (or side-effect-free relative CSS imports) may
// appear in content .mdx files. This is intentionally an allow-list, not a
// deny-list — anything not explicitly permitted fails the build.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const CONTENT_ROOT = 'src/content';
const ALLOWED_COMPONENT_DIR = 'src/components/mdx/';
const IMPORT_RE = /^\s*import\s+(?:[\w${},*\s]+\s+from\s+)?['"]([^'"]+)['"]/gm;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full));
    else if (extname(entry) === '.mdx') out.push(full);
  }
  return out;
}

let files = [];
try {
  files = walk(CONTENT_ROOT);
} catch {
  console.log('No content directory found; nothing to check.');
  process.exit(0);
}

let violations = [];

for (const file of files) {
  const source = readFileSync(file, 'utf-8');
  for (const match of source.matchAll(IMPORT_RE)) {
    const spec = match[1];
    const isAllowedComponent =
      spec.startsWith('../') || spec.startsWith('./')
        ? spec.includes('/components/mdx/') ||
          spec.replace(/^\.+\//, '').startsWith(ALLOWED_COMPONENT_DIR)
        : false;
    const isRelativeStylesheet =
      /\.css$/.test(spec) && (spec.startsWith('./') || spec.startsWith('../'));
    if (!isAllowedComponent && !isRelativeStylesheet) {
      violations.push({ file, spec });
    }
  }
}

if (violations.length > 0) {
  console.error('MDX import allow-list violation(s) — see docs/security/threat-model.md:');
  for (const v of violations) {
    console.error(
      `  ${v.file}: import "${v.spec}" is not in src/components/mdx/ and is not a relative stylesheet.`,
    );
  }
  process.exit(1);
}

console.log(`Checked ${files.length} .mdx file(s). No disallowed imports.`);
