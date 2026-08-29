#!/usr/bin/env node
// Local development stand-in for the CI-generated approval manifest described in
// docs/editorial/publication-gates.md. In real CI (docs/adr/0004), this file is
// produced from GitHub's actual protected-branch review state, required check-run
// results, CODEOWNERS approval, and deployment-environment authorization - never
// from this script. This script exists only so `npm run build` produces a working
// local site without a GitHub Actions pipeline yet. It trusts everything currently
// committed, which is correct for local iteration and would be a critical bug in
// production: do not point CI at this script's output.
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { getCommitSha, withSpan } from './lib/otel.mjs';

const CONTENT_ROOT = 'src/content';
const COLLECTIONS = ['articles', 'briefs'];
const OUT_PATH = process.env.APPROVAL_MANIFEST_PATH ?? 'approval-manifest.local.json';

// Deliberately excluded from this trust-everything local manifest so the Phase 2
// checkpoint can prove the approval boundary against a real build: this fixture is
// content-valid and past its scheduled time but must still never route. See
// src/content/articles/unapproved-but-scheduled-past-due.md and
// scripts/verify-draft-exclusion.mjs.
const FIXTURE_UNAPPROVED_IDS = new Set(['unapproved-but-scheduled-past-due']);

function commitSha(filePath) {
  try {
    const sha = execFileSync('git', ['log', '-1', '--format=%H', '--', filePath], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return sha || 'uncommitted';
  } catch {
    return 'uncommitted';
  }
}

await withSpan(
  'build.approval_manifest',
  {
    'vcs.commit.sha': getCommitSha(),
    'build.manifest.authoritative': false,
  },
  async (span) => {
    const manifest = {};

    for (const collection of COLLECTIONS) {
      const dir = join(CONTENT_ROOT, collection);
      let files = [];
      try {
        files = readdirSync(dir);
      } catch {
        continue;
      }
      for (const file of files) {
        if (!['.md', '.mdx'].includes(extname(file))) continue;
        const id = file.slice(0, -extname(file).length);
        if (FIXTURE_UNAPPROVED_IDS.has(id)) continue;
        const filePath = join(dir, file);
        const key = `${collection}/${id}`;
        manifest[key] = {
          commit_sha: commitSha(filePath),
          required_checks_passed: true,
          codeowners_approved: true,
          deployment_environment_authorized: true,
        };
      }
    }

    const entryCount = Object.keys(manifest).length;
    span.setAttribute('build.manifest.entries', entryCount);
    writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(
      `Wrote ${entryCount} entries to ${OUT_PATH} (local dev stand-in - not authoritative).`,
    );
  },
);
