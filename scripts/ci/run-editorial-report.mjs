#!/usr/bin/env node
// Runs inside .github/workflows/pr-editorial-report.yml. Advisory only -
// never fails the job over a finding, only over a genuine I/O/API error.
// Builds a report for every article/brief changed in this PR (against the
// base branch) and upserts a single PR comment, identified by a hidden
// marker so repeated pushes to the same PR update one comment instead of
// spamming a new one each time.
import { execFileSync } from 'node:child_process';
import { readFullEditorialRecords, readTopicRecords } from '../lib/content-status.mjs';
import { withSpan } from '../lib/otel.mjs';
import {
  seoPreview,
  findPossibleDuplicates,
  findUnlinkedMentions,
  citationCoverage,
} from './editorial-report.mjs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
const prNumber = process.env.PR_NUMBER;
const baseSha = process.env.BASE_SHA;
const headSha = process.env.HEAD_SHA;
const MARKER = '<!-- runtime-signals-editorial-report -->';

if (!repo || !token || !prNumber || !baseSha || !headSha) {
  console.error(
    'Usage: GH_TOKEN=... GITHUB_REPOSITORY=owner/repo PR_NUMBER=... BASE_SHA=... HEAD_SHA=... node run-editorial-report.mjs',
  );
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
    throw new Error(`GitHub API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

function changedContentKeys() {
  // Real local git diff, not the GitHub compare API: this workflow already
  // does a full checkout (fetch-depth: 0) to have the actual file content
  // available for reading, so reusing that same checkout for the diff avoids
  // a second data source that could in principle disagree with it.
  const output = execFileSync(
    'git',
    [
      'diff',
      '--name-only',
      '--diff-filter=ACMR',
      `${baseSha}...${headSha}`,
      '--',
      'src/content/articles',
      'src/content/briefs',
    ],
    { encoding: 'utf-8' },
  );
  const keys = new Set();
  for (const line of output.split('\n')) {
    const match = line.match(/^src\/content\/(articles|briefs)\/(.+)\.mdx?$/);
    if (match) keys.add(`${match[1]}/${match[2]}`);
  }
  return keys;
}

function renderReport(changedRecords, allRecords, allTopics) {
  const sections = changedRecords.map((record) => {
    const seo = seoPreview(record);
    const duplicates = findPossibleDuplicates(record, allRecords);
    const linkCandidates = [...allRecords, ...allTopics].filter((c) => c.key !== record.key);
    const unlinked = findUnlinkedMentions(record.body, linkCandidates);
    const coverage = citationCoverage(record.claims);

    const lines = [`### \`${record.path}\``, '', '**SEO preview**', ''];
    lines.push(`> **${seo.displayTitle}**`);
    lines.push(`> ${seo.description || '_(no description)_'}`);
    if (seo.warnings.length > 0) {
      for (const w of seo.warnings) lines.push(`- ⚠️ ${w}`);
    } else {
      lines.push('- ✅ No SEO length issues.');
    }

    lines.push('', '**Possible duplicate coverage**', '');
    if (duplicates.length > 0) {
      for (const d of duplicates.slice(0, 5)) {
        lines.push(`- ${(d.score * 100).toFixed(0)}% overlap with \`${d.key}\` ("${d.title}")`);
      }
    } else {
      lines.push('- ✅ No existing piece scores above the similarity threshold.');
    }

    lines.push('', '**Internal-link suggestions**', '');
    if (unlinked.length > 0) {
      for (const u of unlinked.slice(0, 10)) {
        lines.push(`- Mentions "${u.title}" - consider linking to \`${u.path}\``);
      }
    } else {
      lines.push('- ✅ No unlinked mentions of other content found.');
    }

    lines.push('', '**Citation and source coverage**', '');
    if (coverage.total === 0) {
      lines.push('- No claims declared in frontmatter.');
    } else {
      lines.push(
        `- ${coverage.total} claim(s): ${coverage.supported} supported, ${coverage.mixed} mixed, ${coverage.inference} inference, ${coverage.opinion} opinion (${(coverage.supportedRatio * 100).toFixed(0)}% supported).`,
      );
    }
    lines.push('');
    return lines.join('\n');
  });

  return [
    MARKER,
    '## Editorial quality report',
    '',
    '_Advisory only - nothing here blocks this PR. Human review and CODEOWNERS approval remain mandatory regardless of these findings._',
    '',
    changedRecords.length === 0
      ? 'No article or brief content changed in this PR.'
      : sections.join('\n---\n\n'),
  ].join('\n');
}

async function upsertComment(body) {
  const comments = await githubApi(`/issues/${prNumber}/comments`);
  const existing = comments.find((c) => c.body?.includes(MARKER));
  if (existing) {
    await withSpan(
      'editorial_report.post_comment',
      {
        'github.issue.number': Number(prNumber),
        'github.comment.action': 'update',
        'boundary.kind': 'outbound_notification',
      },
      () =>
        githubApi(`/issues/comments/${existing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ body }),
        }),
    );
    console.log(`Updated existing editorial-report comment (id ${existing.id}).`);
  } else {
    await withSpan(
      'editorial_report.post_comment',
      {
        'github.issue.number': Number(prNumber),
        'github.comment.action': 'create',
        'boundary.kind': 'outbound_notification',
      },
      () =>
        githubApi(`/issues/${prNumber}/comments`, {
          method: 'POST',
          body: JSON.stringify({ body }),
        }),
    );
    console.log('Posted a new editorial-report comment.');
  }
}

async function main() {
  await withSpan(
    'editorial_report.generate',
    {
      'github.issue.number': Number(prNumber),
      'vcs.base_sha': baseSha,
      'vcs.head_sha': headSha,
    },
    async (span) => {
      const changedKeys = changedContentKeys();
      const allRecords = readFullEditorialRecords();
      const allTopics = readTopicRecords();
      const changedRecords = allRecords.filter((r) => changedKeys.has(r.key));

      span.setAttribute('editorial.changed_content_count', changedRecords.length);
      const report = renderReport(changedRecords, allRecords, allTopics);
      await upsertComment(report);
    },
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
