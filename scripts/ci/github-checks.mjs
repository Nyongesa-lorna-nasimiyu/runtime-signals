// Pure decision logic for the real (CI) approval manifest — separated from the
// GitHub API I/O in generate-real-approval-manifest.mjs so it's directly unit
// testable (tests/unit/github-checks.test.ts) without a live repo. This
// project has no GitHub remote yet (a local-only git repo throughout Phase 1
// and 2), so these functions are what's actually verified; the workflow
// wiring around them (.github/workflows/deploy.yml) has correct-by-reading
// confidence against GitHub's documented REST API, not a real triggered run —
// that verification is itself a launch-blocker item once a GitHub remote and
// branch protection exist.

export const REQUIRED_CHECK_NAMES = ['publication-gate'];

/**
 * True only if every required check name has a completed, successful run for
 * this commit. Does not special-case "no checks found" as passing — an empty
 * or missing required check is a failure to authorize, not a pass by default.
 */
export function allRequiredChecksPassed(checkRuns, requiredNames = REQUIRED_CHECK_NAMES) {
  return requiredNames.every((name) =>
    checkRuns.some(
      (run) => run.name === name && run.status === 'completed' && run.conclusion === 'success',
    ),
  );
}

/**
 * True if at least one review on the PR is in the APPROVED state. This does
 * NOT independently verify the approver was a CODEOWNERS-designated reviewer
 * — that enforcement is delegated to GitHub's own "Require review from Code
 * Owners" branch-protection setting (a required repository configuration,
 * documented in docs/editorial/publication-gates.md), because a merge to a
 * protected `main` could only happen if that setting already enforced it.
 * Re-implementing CODEOWNERS file matching here would be duplicate,
 * divergeable logic for a check GitHub already performs authoritatively.
 */
export function hasApprovingReview(reviews) {
  return reviews.some((r) => r.state === 'APPROVED');
}

/**
 * A pull request is associated with this commit only if GitHub reports one
 * whose merge_commit_sha matches — a commit reachable on main some other way
 * (a direct push, if branch protection were ever misconfigured to allow it)
 * must not be treated as though it went through review.
 */
export function findMergedPullRequest(pullRequests, commitSha) {
  return pullRequests.find((pr) => pr.merge_commit_sha === commitSha) ?? null;
}
