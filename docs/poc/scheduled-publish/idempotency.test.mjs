import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSnapshot } from './idempotency.mjs';

function record(overrides = {}) {
  return {
    status: 'scheduled',
    title: 'A published article',
    canonical: 'https://runtimesignals.tech/articles/example',
    sources: ['https://example.org/source'],
    published_at: '2026-08-01T00:00:00Z',
    commit_sha: 'sha-v1',
    content_digest: 'digest-of-title-body-sources-v1',
    ...overrides,
  };
}

function manifestFor(record, overrides = {}) {
  return new Map([[record.canonical, {
    commit_sha: record.commit_sha,
    required_checks_passed: true,
    codeowners_approved: true,
    deployment_environment_authorized: true,
    ...overrides,
  }]]);
}

test('rerunning the scheduled build at a later time with no new content is a no-op', () => {
  const r = record();
  const manifest = manifestFor(r);
  const firstRun = buildSnapshot([r], manifest, new Date('2026-08-28T04:05:00Z'));
  const secondRun = buildSnapshot([r], manifest, new Date('2026-08-29T04:05:00Z'));
  assert.equal(firstRun.hash, secondRun.hash);
});

test('critical: editing the body/title/sources without changing canonical or published_at changes the hash', () => {
  const now = new Date('2026-08-28T04:05:00Z');
  const original = record();
  const edited = record({ commit_sha: 'sha-v2', content_digest: 'digest-of-title-body-sources-v2' });
  const before = buildSnapshot([original], manifestFor(original), now);
  const after = buildSnapshot([edited], manifestFor(edited), now);
  assert.notEqual(before.hash, after.hash);
  assert.notEqual(before.records[0].content_digest, after.records[0].content_digest);
});

test('snapshot is independent of input array order', () => {
  const a = record({ canonical: 'https://runtimesignals.tech/articles/a', commit_sha: 'sha-a' });
  const b = record({ canonical: 'https://runtimesignals.tech/articles/b', commit_sha: 'sha-b' });
  const now = new Date('2026-08-28T04:05:00Z');
  const manifest = new Map([...manifestFor(a), ...manifestFor(b)]);
  const forward = buildSnapshot([a, b], manifest, now);
  const reversed = buildSnapshot([b, a], manifest, now);
  assert.equal(forward.hash, reversed.hash);
});

test('a future-dated record is excluded, then included once its time passes, without manual intervention', () => {
  const r = record({ published_at: '2026-09-15T00:00:00Z' });
  const manifest = manifestFor(r);
  const beforePublish = buildSnapshot([r], manifest, new Date('2026-09-01T00:00:00Z'));
  const afterPublish = buildSnapshot([r], manifest, new Date('2026-09-15T00:00:01Z'));
  assert.equal(beforePublish.records.length, 0);
  assert.equal(afterPublish.records.length, 1);
  assert.notEqual(beforePublish.hash, afterPublish.hash);
});

test('content edited after approval is excluded until the manifest is updated for the new commit', () => {
  const now = new Date('2026-08-28T04:05:00Z');
  const original = record();
  const approvedManifest = manifestFor(original);
  const editedAfterApproval = record({ commit_sha: 'sha-v2-unreviewed', content_digest: 'digest-v2' });
  const snapshot = buildSnapshot([editedAfterApproval], approvedManifest, now);
  assert.equal(snapshot.records.length, 0);
});

test('a forged frontmatter approval field has no effect without a matching manifest entry', () => {
  const now = new Date('2026-08-28T04:05:00Z');
  const r = record({ approval: true, status_approved: true });
  const snapshot = buildSnapshot([r], new Map(), now);
  assert.equal(snapshot.records.length, 0);
});
