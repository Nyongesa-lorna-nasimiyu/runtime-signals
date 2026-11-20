#!/usr/bin/env node
// Real build-time and Pagefind-index measurements at 100/1,000/5,000
// documents - what ADR-0001's migration boundary (1-2 MB compressed search
// payload) is actually measured against, and what docs/poc/README.md's
// "Remaining: fixture scaling" item asked for. Generates synthetic articles
// directly into src/content/articles/ (reusing the real schema, real
// publication.ts filtering, real Pagefind run), measures, and always removes
// them again in a `finally` block, even on failure, so a crash mid-run can't
// leave synthetic fixtures mixed into real content.
//
// SKIP_OG_RENDER=true (src/lib/og-image.ts) is set for the main scale loop:
// a first, un-isolated run at 1,000 documents took 578s to build - Satori
// font-shaping + resvg PNG encoding per document, sequential in Astro's
// static path generation, dominates so badly it was measuring OG-image cost,
// not the Pagefind/content-build cost this scale test actually cares about.
// A separate, direct benchmark below characterizes the real OG cost properly
// instead, without needing a full Astro build cycle per data point.
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ARTICLES_DIR = 'src/content/articles';
const SYNTHETIC_PREFIX = 'synthetic-scale-';
const SCALES = [100, 1000, 5000];

// Roughly matches the real article's length (~550 words) so the measurement
// reflects realistic per-document weight, not a trivial stub.
const PARAGRAPH =
  'When a distributed step hands work to the next stage, the transfer is usually implemented as passing along whatever context happens to be in scope. That works until the receiving stage needs something the transcript does not carry explicitly: a partial result, a constraint the first stage resolved but never restated, or the reason a prior attempt failed. Treating a handoff as implicit context sharing hides the real state boundary between the two stages. Nothing forces an author to enumerate what must survive the transfer, so it becomes easy to lose exactly the information a recovery path needs, often only visible after a retry silently redoes work an earlier attempt already completed. A transfer is a state boundary with a contract. Anything the next stage needs has to be part of an explicit interface, not an implicit assumption about what context will happen to contain by the time execution reaches that point.';

function syntheticArticle(index) {
  const day = (index % 27) + 1;
  const month = ((Math.floor(index / 27) % 12) + 1).toString().padStart(2, '0');
  return `---
title: Synthetic fixture article ${index}
dek: Generated for build-time and index-size measurement at scale; not real content.
status: published
kind: article
authors: [jordan-avery]
topics: [reliability]
published_at: 2025-${month}-${String(day).padStart(2, '0')}T07:00:00Z
reading_time_minutes: 4
claims: []
---

${PARAGRAPH}

## Failure mechanism

${PARAGRAPH}

## Practice

${PARAGRAPH}
`;
}

function generate(count) {
  for (let i = 0; i < count; i++) {
    writeFileSync(join(ARTICLES_DIR, `${SYNTHETIC_PREFIX}${i}.md`), syntheticArticle(i));
  }
}

function cleanup() {
  for (const file of readdirSync(ARTICLES_DIR)) {
    if (file.startsWith(SYNTHETIC_PREFIX)) unlinkSync(join(ARTICLES_DIR, file));
  }
}

function run(cmd, args, extraEnv = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...extraEnv },
  });
}

function dirBytes(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    total += entry.isDirectory() ? dirBytes(full) : statSync(full).size;
  }
  return total;
}

const results = [];

try {
  for (const scale of SCALES) {
    cleanup();
    generate(scale);
    run('node', ['scripts/generate-approval-manifest.mjs']);

    const buildStart = Date.now();
    run('npx', ['astro', 'build'], { SKIP_OG_RENDER: 'true' });
    const buildMs = Date.now() - buildStart;

    const pagefindStart = Date.now();
    run('npx', ['pagefind', '--site', 'dist', '--output-subdir', 'pagefind']);
    const pagefindMs = Date.now() - pagefindStart;

    const pagefindBytes = dirBytes('dist/pagefind');

    results.push({
      scale,
      build_ms: buildMs,
      pagefind_ms: pagefindMs,
      pagefind_raw_bytes: pagefindBytes,
    });
    console.log(
      `scale=${scale}: build=${buildMs}ms pagefind=${pagefindMs}ms index=${pagefindBytes}B`,
    );
  }
} finally {
  cleanup();
  run('node', ['scripts/generate-approval-manifest.mjs']);
}

console.log(
  '\n--- Content-build + Pagefind scaling (OG generation excluded via SKIP_OG_RENDER) ---',
);
console.log(JSON.stringify(results, null, 2));

// Direct OG-generation benchmark: real Satori + resvg render, no Astro build
// overhead, so this isolates exactly the cost that made the un-isolated scale
// run unusable.
console.log('\n--- Direct OG-image generation benchmark (real Satori + resvg, no Astro build) ---');
const ogBenchScript = `
import { renderOgImage } from '../src/lib/og-image.ts';
const N = 20;
const start = Date.now();
for (let i = 0; i < N; i++) {
  await renderOgImage({ title: 'Benchmark article ' + i, eyebrow: 'Reliability', seed: i });
}
const totalMs = Date.now() - start;
console.log(JSON.stringify({ iterations: N, total_ms: totalMs, avg_ms_per_image: Math.round(totalMs / N) }));
`;
writeFileSync('scripts/_og-bench-temp.mjs', ogBenchScript);
try {
  const output = run('npx', ['tsx', 'scripts/_og-bench-temp.mjs']);
  console.log(output.trim());
} finally {
  unlinkSync('scripts/_og-bench-temp.mjs');
}
