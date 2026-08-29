import { describe, it, expect } from 'vitest';
import { isPubliclyLive, isArchived, isRoutable, canPublish } from '@/lib/publication';
import { isApprovedFor } from '@/lib/approval';
import type { CollectionEntry } from 'astro:content';

type Editorial = CollectionEntry<'articles'>;

function entry(
  overrides: Partial<Editorial['data']> & { filePath?: string; id?: string },
): Editorial {
  const { filePath = 'fixture/does-not-exist.md', id = 'fixture', ...data } = overrides;
  return {
    id,
    collection: 'articles',
    filePath,
    data: {
      status: 'draft',
      published_at: new Date('2026-01-01T00:00:00Z'),
      ...data,
    },
  } as unknown as Editorial;
}

const NOW = new Date('2026-06-01T00:00:00Z');

describe('isPubliclyLive', () => {
  it('is true for published content regardless of published_at', () => {
    expect(
      isPubliclyLive(entry({ status: 'published', published_at: new Date('2099-01-01') }), NOW),
    ).toBe(true);
  });

  it('is true for scheduled content once published_at has passed', () => {
    expect(
      isPubliclyLive(entry({ status: 'scheduled', published_at: new Date('2026-01-01') }), NOW),
    ).toBe(true);
  });

  it('is false for scheduled content whose published_at has not passed', () => {
    expect(
      isPubliclyLive(entry({ status: 'scheduled', published_at: new Date('2099-01-01') }), NOW),
    ).toBe(false);
  });

  it('is false for draft content even with a past published_at', () => {
    expect(
      isPubliclyLive(entry({ status: 'draft', published_at: new Date('2020-01-01') }), NOW),
    ).toBe(false);
  });

  it('is false for archived content', () => {
    expect(
      isPubliclyLive(entry({ status: 'archived', published_at: new Date('2020-01-01') }), NOW),
    ).toBe(false);
  });
});

describe('isArchived / isRoutable', () => {
  it('archived content is routable but not publicly live', () => {
    const e = entry({ status: 'archived', published_at: new Date('2020-01-01') });
    expect(isArchived(e)).toBe(true);
    expect(isRoutable(e, NOW)).toBe(true);
    expect(isPubliclyLive(e, NOW)).toBe(false);
  });

  it('draft content is neither routable nor live', () => {
    const e = entry({ status: 'draft', published_at: new Date('2020-01-01') });
    expect(isRoutable(e, NOW)).toBe(false);
  });

  it('not-yet-due scheduled content is not routable', () => {
    const e = entry({ status: 'scheduled', published_at: new Date('2099-01-01') });
    expect(isRoutable(e, NOW)).toBe(false);
  });
});

describe('canPublish - content validity and authorization are both required', () => {
  it('is false when live content has no matching manifest entry', () => {
    const e = entry({ status: 'published', published_at: new Date('2020-01-01') });
    expect(canPublish(e, {}, NOW)).toBe(false);
  });

  it('is false when content is not yet live, even with a valid manifest entry', () => {
    const e = entry({
      status: 'scheduled',
      published_at: new Date('2099-01-01'),
      filePath: 'fixture/never-committed.md',
    });
    const manifest = {
      'articles/fixture': {
        commit_sha: 'uncommitted',
        required_checks_passed: true,
        codeowners_approved: true,
        deployment_environment_authorized: true,
      },
    };
    expect(canPublish(e, manifest, NOW)).toBe(false);
  });

  it('is true when content is live and the manifest authorizes the exact (uncommitted-fixture) sha', () => {
    // A nonexistent filePath makes git report no history for it, which
    // commitShaForFile treats as 'uncommitted' - a deterministic, git-independent
    // value this test can match against.
    const e = entry({
      status: 'published',
      published_at: new Date('2020-01-01'),
      id: 'fixture',
      filePath: 'fixture/never-committed.md',
    });
    const manifest = {
      'articles/fixture': {
        commit_sha: 'uncommitted',
        required_checks_passed: true,
        codeowners_approved: true,
        deployment_environment_authorized: true,
      },
    };
    expect(canPublish(e, manifest, NOW)).toBe(true);
  });

  it('getPublishedEntries excludes everything except the fully live-and-approved case, sorted newest first', () => {
    const manifest = {
      'articles/live-a': {
        commit_sha: 'uncommitted',
        required_checks_passed: true,
        codeowners_approved: true,
        deployment_environment_authorized: true,
      },
      'articles/live-b': {
        commit_sha: 'uncommitted',
        required_checks_passed: true,
        codeowners_approved: true,
        deployment_environment_authorized: true,
      },
    };
    const entries = [
      entry({ id: 'live-a', status: 'published', published_at: new Date('2026-01-01') }),
      entry({ id: 'live-b', status: 'published', published_at: new Date('2026-03-01') }),
      entry({ id: 'draft-x', status: 'draft', published_at: new Date('2020-01-01') }),
      entry({ id: 'unapproved-y', status: 'published', published_at: new Date('2020-01-01') }),
    ];
    // getPublishedEntries loads its own manifest via loadApprovalManifest(), so this
    // replicates its filter *and* its newest-first sort against an injected manifest
    // instead of going through the manifest-loading wrapper.
    const live = entries
      .filter((e) => canPublish(e, manifest, NOW))
      .sort((a, b) => b.data.published_at.getTime() - a.data.published_at.getTime());
    expect(live.map((e) => e.id)).toEqual(['live-b', 'live-a']);
  });
});

describe('isApprovedFor', () => {
  it('rejects when no manifest entry exists', () => {
    expect(isApprovedFor('articles/x', 'sha1', {})).toBe(false);
  });

  it('rejects when the commit sha does not match (content edited after approval)', () => {
    const manifest = {
      'articles/x': {
        commit_sha: 'old-sha',
        required_checks_passed: true,
        codeowners_approved: true,
        deployment_environment_authorized: true,
      },
    };
    expect(isApprovedFor('articles/x', 'new-sha', manifest)).toBe(false);
  });

  it('rejects when any trust signal is false', () => {
    const base = {
      commit_sha: 'sha1',
      required_checks_passed: true,
      codeowners_approved: true,
      deployment_environment_authorized: true,
    };
    expect(
      isApprovedFor('articles/x', 'sha1', {
        'articles/x': { ...base, required_checks_passed: false },
      }),
    ).toBe(false);
    expect(
      isApprovedFor('articles/x', 'sha1', {
        'articles/x': { ...base, codeowners_approved: false },
      }),
    ).toBe(false);
    expect(
      isApprovedFor('articles/x', 'sha1', {
        'articles/x': { ...base, deployment_environment_authorized: false },
      }),
    ).toBe(false);
  });

  it('accepts when the sha matches and every trust signal is true', () => {
    const manifest = {
      'articles/x': {
        commit_sha: 'sha1',
        required_checks_passed: true,
        codeowners_approved: true,
        deployment_environment_authorized: true,
      },
    };
    expect(isApprovedFor('articles/x', 'sha1', manifest)).toBe(true);
  });
});
