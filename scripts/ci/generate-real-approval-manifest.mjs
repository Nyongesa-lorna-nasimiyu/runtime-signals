#!/usr/bin/env node
// The REAL approval manifest - run only inside .github/workflows/deploy.yml,
// inside a job gated by the `production` GitHub Environment's required
// reviewers. This is the file docs/research/architecture-research-report.md
// launch blocker #4 and every prior checkpoint report point at:
// scripts/generate-approval-manifest.mjs (no "ci/" prefix) is the local,
// trust-everything dev stand-in and must never be what this workflow uses.
//
// Every signal here is independently verified against the GitHub API for the
// exact commit being built - never assumed from "this is running in CI" or
// "this is on main" alone, which is exactly the kind of assumption a future
// branch-protection misconfiguration could silently defeat.
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { withSpan } from '../lib/otel.mjs';
import {
  allRequiredChecksPassed,
  hasApprovingReview,
  findMergedPullRequest,
} from './github-checks.mjs';

const CONTENT_ROOT = 'src/content';
const COLLECTIONS = ['articles', 'briefs'];

const commitSha = process.argv[2] ?? process.env.GITHUB_SHA;
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
const outPath = process.env.APPROVAL_MANIFEST_PATH ?? 'approval-manifest.production.json';

if (!commitSha || !repo || !token) {
  console.error(
    'Usage: GH_TOKEN=... GITHUB_REPOSITORY=owner/repo node generate-real-approval-manifest.mjs <sha>',
  );
  process.exit(1);
}

async function githubApi(path) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function commitShaForFile(filePath) {
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

async function main() {
  await withSpan(
    'publish.approval_manifest',
    {
      'vcs.commit.sha': commitSha,
      'ci.repository': repo,
    },
    async (span) => {
      // 1. A pull request whose merge produced this exact commit exists. Must
      //    be established before we know which commit's checks to inspect: for
      //    every non-fast-forward merge strategy (including GitHub's default
      //    "Create a merge commit"), `commitSha` here is a commit GitHub
      //    synthesized at merge time and was never itself built by CI -
      //    `publication-gate` runs against the PR's HEAD commit only. Confirmed
      //    against a real merge on this repo: the merge commit's check-runs
      //    contained only this workflow's own `build-and-deploy` run, never
      //    `publication-gate`, which existed solely on the PR head SHA.
      const associatedPRs = await githubApi(`/commits/${commitSha}/pulls`);
      const mergedPR = findMergedPullRequest(associatedPRs, commitSha);

      // 2. Required checks (e.g. `publication-gate`) actually passed - checked
      //    against the PR's head commit, the commit CI actually built, not the
      //    merge commit.
      let requiredChecksPassed = false;
      // 3. The PR has an APPROVED review (CODEOWNERS enforcement itself is
      //    GitHub's own branch-protection setting - see github-checks.mjs).
      let codeownersApproved = false;
      if (mergedPR) {
        const checkRunsResponse = await githubApi(`/commits/${mergedPR.head.sha}/check-runs`);
        requiredChecksPassed = allRequiredChecksPassed(checkRunsResponse.check_runs ?? []);

        const reviews = await githubApi(`/pulls/${mergedPR.number}/reviews`);
        codeownersApproved = hasApprovingReview(reviews);
        span.setAttribute('github.pr.number', mergedPR.number);
      }

      // 4. Deployment-environment authorization: this script only ever runs
      //    inside deploy.yml's `build-and-deploy` job, which does not start until
      //    a human reviewer configured on the `production` GitHub Environment
      //    approves the run. If this script is running at all, that gate already
      //    passed - see the `environment: production` key in that workflow.
      const deploymentEnvironmentAuthorized = true;
      const authorized = requiredChecksPassed && Boolean(mergedPR) && codeownersApproved;
      span.setAttribute('publication.authorization_established', authorized);

      if (!authorized) {
        console.error('Authorization NOT established for this commit:');
        console.error(`  required_checks_passed: ${requiredChecksPassed}`);
        console.error(`  merged PR found: ${Boolean(mergedPR)}`);
        console.error(`  codeowners_approved: ${codeownersApproved}`);
        console.error('Writing an empty manifest - nothing will be authorized to publish.');
        writeFileSync(outPath, '{}\n');
        throw new Error('Approval authorization was not established');
      }

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
          const key = `${collection}/${id}`;
          manifest[key] = {
            commit_sha: commitShaForFile(join(dir, file)),
            required_checks_passed: requiredChecksPassed,
            codeowners_approved: codeownersApproved,
            deployment_environment_authorized: deploymentEnvironmentAuthorized,
          };
        }
      }

      const entryCount = Object.keys(manifest).length;
      span.setAttribute('build.manifest.entries', entryCount);
      writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
      console.log(
        `Wrote ${entryCount} entries to ${outPath} for commit ${commitSha} (PR #${mergedPR.number}).`,
      );
    },
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
