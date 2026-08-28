#!/usr/bin/env node
// Real-Pagefind-index counterpart to docs/poc/search-size/measure.mjs, which was
// explicitly a synthetic payload estimate. This measures the actual index Pagefind
// wrote to dist/pagefind/ after a real Astro build, at whatever content volume
// exists right now. Deferred-POC completion: see docs/poc/README.md.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const PAGEFIND_DIR = process.argv[2] ?? 'dist/pagefind';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

let files;
try {
  files = walk(PAGEFIND_DIR);
} catch (err) {
  console.error(`Could not read ${PAGEFIND_DIR}: ${err.message}`);
  console.error('Run `npm run build` first (postbuild runs `pagefind --site dist`).');
  process.exit(1);
}

let rawTotal = 0;
let gzipTotal = 0;
const byExt = {};

for (const file of files) {
  const buf = readFileSync(file);
  const gz = gzipSync(buf);
  rawTotal += buf.byteLength;
  gzipTotal += gz.byteLength;
  const ext = file.split('.').pop();
  byExt[ext] = byExt[ext] ?? { count: 0, raw: 0, gzip: 0 };
  byExt[ext].count += 1;
  byExt[ext].raw += buf.byteLength;
  byExt[ext].gzip += gz.byteLength;
}

console.log(
  JSON.stringify(
    {
      directory: PAGEFIND_DIR,
      file_count: files.length,
      raw_bytes: rawTotal,
      gzip_bytes: gzipTotal,
      by_extension: byExt,
      note: 'Real index at current fixture-article volume. Re-measure at realistic archive size before launch; docs/adr/0001 migration boundary is 1-2 MB compressed.',
    },
    null,
    2,
  ),
);
