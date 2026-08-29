import { describe, it, expect } from 'vitest';
import {
  allRequiredChecksPassed,
  hasApprovingReview,
  findMergedPullRequest,
} from '../../scripts/ci/github-checks.mjs';

describe('allRequiredChecksPassed', () => {
  it('is false when no check runs exist for this commit', () => {
    expect(allRequiredChecksPassed([])).toBe(false);
  });

  it('is false when the required check exists but has not completed', () => {
    const runs = [{ name: 'publication-gate', status: 'in_progress', conclusion: null }];
    expect(allRequiredChecksPassed(runs)).toBe(false);
  });

  it('is false when the required check completed but failed', () => {
    const runs = [{ name: 'publication-gate', status: 'completed', conclusion: 'failure' }];
    expect(allRequiredChecksPassed(runs)).toBe(false);
  });

  it('is false when only an unrelated check passed', () => {
    const runs = [{ name: 'some-other-check', status: 'completed', conclusion: 'success' }];
    expect(allRequiredChecksPassed(runs)).toBe(false);
  });

  it('is true when the required check completed successfully', () => {
    const runs = [{ name: 'publication-gate', status: 'completed', conclusion: 'success' }];
    expect(allRequiredChecksPassed(runs)).toBe(true);
  });

  it('requires every name in a custom required-name list', () => {
    const runs = [{ name: 'a', status: 'completed', conclusion: 'success' }];
    expect(allRequiredChecksPassed(runs, ['a', 'b'])).toBe(false);
    expect(allRequiredChecksPassed(runs, ['a'])).toBe(true);
  });
});

describe('hasApprovingReview', () => {
  it('is false with no reviews', () => {
    expect(hasApprovingReview([])).toBe(false);
  });

  it('is false when reviews exist but none are approved', () => {
    expect(hasApprovingReview([{ state: 'COMMENTED' }, { state: 'CHANGES_REQUESTED' }])).toBe(
      false,
    );
  });

  it('is true when at least one review is approved, even alongside others', () => {
    expect(hasApprovingReview([{ state: 'CHANGES_REQUESTED' }, { state: 'APPROVED' }])).toBe(true);
  });
});

describe('findMergedPullRequest', () => {
  const commitSha = 'abc123';

  it('returns null when no PR matches this commit as its merge commit', () => {
    const prs = [{ number: 1, merge_commit_sha: 'different-sha' }];
    expect(findMergedPullRequest(prs, commitSha)).toBeNull();
  });

  it('finds the PR whose merge_commit_sha matches exactly', () => {
    const prs = [
      { number: 1, merge_commit_sha: 'different-sha' },
      { number: 2, merge_commit_sha: commitSha },
    ];
    expect(findMergedPullRequest(prs, commitSha)?.number).toBe(2);
  });

  it('does not match a commit that is merely associated with a PR but is not its merge commit', () => {
    // e.g. an intermediate commit from before the PR was merged/squashed
    const prs = [{ number: 1, merge_commit_sha: 'the-actual-squash-commit' }];
    expect(findMergedPullRequest(prs, commitSha)).toBeNull();
  });
});
