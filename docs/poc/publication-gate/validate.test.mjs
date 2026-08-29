import test from 'node:test';
import assert from 'node:assert/strict';
import { isContentValid, isPublishable, isApproved, canPublish } from './validate.mjs';

const record = {
  status: 'scheduled',
  title: 'A systems invariant',
  canonical: 'https://runtimesignals.tech/articles/invariant',
  sources: ['source-1'],
  published_at: '2026-08-28T04:00:00Z',
  commit_sha: 'abc123',
};

function manifestWith(overrides = {}) {
  return new Map([[record.canonical, {
    commit_sha: 'abc123',
    required_checks_passed: true,
    codeowners_approved: true,
    deployment_environment_authorized: true,
    ...overrides,
  }]]);
}

test('valid, scheduled, future-timed content is publishable content on its own - but not yet authorized', () => {
  const now = new Date('2026-08-28T04:01:00Z');
  assert.equal(isPublishable(record, now), true);
  assert.equal(canPublish(record, new Map(), now), false);
});

test('malformed or draft or unsourced or future content fails content validation regardless of approval', () => {
  const now = new Date('2026-08-28T04:01:00Z');
  const manifest = manifestWith();
  assert.equal(canPublish({ ...record, status: 'draft' }, manifest, now), false);
  assert.equal(canPublish({ ...record, sources: [] }, manifest, now), false);
  assert.equal(canPublish(record, manifest, new Date('2026-08-28T03:59:00Z')), false);
  assert.equal(isContentValid({ ...record, title: '' }), false);
});

test('a frontmatter approval flag has no effect - approval only comes from the manifest', () => {
  const now = new Date('2026-08-28T04:01:00Z');
  const forgedRecord = { ...record, approval: true, status_approved: true };
  assert.equal(canPublish(forgedRecord, new Map(), now), false);
});

test('approval is rejected if the manifest entry is for a different commit than the built content', () => {
  const now = new Date('2026-08-28T04:01:00Z');
  const staleManifest = manifestWith({ commit_sha: 'old-sha-before-a-late-edit' });
  assert.equal(isApproved(record, staleManifest), false);
  assert.equal(canPublish(record, staleManifest, now), false);
});

test('approval requires every trust signal, not just a matching commit', () => {
  assert.equal(isApproved(record, manifestWith({ required_checks_passed: false })), false);
  assert.equal(isApproved(record, manifestWith({ codeowners_approved: false })), false);
  assert.equal(isApproved(record, manifestWith({ deployment_environment_authorized: false })), false);
});

test('content valid, timed, and fully approved for the matching commit publishes', () => {
  const now = new Date('2026-08-28T04:01:00Z');
  assert.equal(canPublish(record, manifestWith(), now), true);
});
