#!/usr/bin/env node
// Runs inside .github/workflows/scheduled-publish.yml. Decides whether any
// content newly became due since the last successful tick and, if so,
// dispatches deploy.yml against the current main HEAD - reusing that
// workflow's existing approval-manifest, build, verification, and
// production-environment-reviewer gates entirely rather than duplicating any
// of them. A commit already on main only ever got there through a reviewed,
// checked PR merge (branch protection), so deploy.yml's manifest generator
// (scripts/ci/generate-real-approval-manifest.mjs) resolves correctly no
// matter how long ago that merge happened.
import { writeFileSync } from 'node:fs';
import { readEditorialRecords } from '../lib/content-status.mjs';
import { getCommitSha, withSpan } from '../lib/otel.mjs';
import { contentDueSince, shouldTriggerDeploy } from './schedule-decision.mjs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
const auditPath = process.env.SCHEDULE_AUDIT_PATH ?? 'schedule-audit.json';
// Bootstrap fallback only: used the very first time this workflow ever runs
// successfully, when no prior successful run exists to read a watermark
// from. 3 hours comfortably covers the hourly cron cadence documented in
// docs/editorial/scheduled-publishing.md plus room for a delayed first run,
// without silently republishing content that's been live for a long time.
const BOOTSTRAP_LOOKBACK_MS = 3 * 60 * 60 * 1000;

if (!repo || !token) {
  console.error('Usage: GH_TOKEN=... GITHUB_REPOSITORY=owner/repo node run-scheduled-publish.mjs');
  process.exit(1);
}

async function githubApi(path, init = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const err = new Error(`GitHub API ${path} failed: ${res.status} ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  // workflow dispatch returns 204 No Content
  return res.status === 204 ? null : res.json();
}

async function lastSuccessfulRunWatermark(now) {
  let runs;
  try {
    runs = await githubApi(
      '/actions/workflows/scheduled-publish.yml/runs?status=success&per_page=1',
    );
  } catch (err) {
    // 404 means this workflow file doesn't exist on any ref GitHub has
    // indexed yet - true before its first merge to main, not a real error.
    // Once merged, this same query returns 200 with an empty array instead,
    // which the fallback below already covers identically.
    if (err.status === 404) {
      console.log('scheduled-publish.yml not found yet (pre-merge) - using bootstrap lookback.');
      return new Date(now.getTime() - BOOTSTRAP_LOOKBACK_MS);
    }
    throw err;
  }
  const lastRun = runs.workflow_runs?.[0];
  if (lastRun) return new Date(lastRun.created_at);
  console.log('No prior successful scheduled-publish run found - using bootstrap lookback.');
  return new Date(now.getTime() - BOOTSTRAP_LOOKBACK_MS);
}

async function main() {
  await withSpan(
    'publish.scheduled_check',
    {
      'vcs.commit.sha': getCommitSha(),
      'ci.repository': repo,
    },
    async (span) => {
      const now = new Date();
      const watermark = await lastSuccessfulRunWatermark(now);
      const records = readEditorialRecords();
      const due = contentDueSince(records, watermark, now);
      const willDeploy = shouldTriggerDeploy(records, watermark, now);

      const audit = {
        watermark: watermark.toISOString(),
        now: now.toISOString(),
        due_keys: due.map((r) => r.key),
        triggered_deploy: willDeploy,
      };
      span.setAttribute('publication.due_count', due.length);
      span.setAttribute('publication.deploy_triggered', willDeploy);
      writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);

      if (!willDeploy) {
        console.log(`Nothing due between ${audit.watermark} and ${audit.now}. No-op.`);
        return;
      }

      console.log(`Newly due since ${audit.watermark}: ${due.map((r) => r.key).join(', ')}`);
      await withSpan(
        'publish.deploy_dispatch',
        {
          'ci.repository': repo,
          'github.workflow': 'deploy.yml',
          'github.ref': 'main',
          'boundary.kind': 'outbound_trigger',
        },
        () =>
          githubApi('/actions/workflows/deploy.yml/dispatches', {
            method: 'POST',
            body: JSON.stringify({ ref: 'main' }),
          }),
      );
      console.log('Dispatched deploy.yml against main.');
    },
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
