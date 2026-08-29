# Scheduled publishing

Date: 2026-08-29

How `status: scheduled` content actually goes live at its `published_at` time, on a real clock - not just "whenever someone next merges something unrelated."

## The mechanism

`src/lib/publication.ts`'s `isPubliclyLive` already makes scheduled content live automatically once `published_at` passes, with no write-back to frontmatter - proven idempotent by `docs/poc/scheduled-publish/idempotency.mjs`. The gap that closes is: a static site only re-evaluates "what's live" when it rebuilds, and `deploy.yml` only rebuilds on a push to `main`. `.github/workflows/scheduled-publish.yml` is what makes a rebuild actually happen near the right time, by running hourly and, if anything newly became due, dispatching `deploy.yml` against `main`'s current HEAD.

`deploy.yml` is not duplicated or reimplemented for this - `scheduled-publish.yml` only decides *whether* to rebuild. The dispatched run goes through the exact same approval-manifest generation, build, verification, and production-environment reviewer approval as a normal merge-triggered deploy. A commit only ever reaches `main` through a reviewed, checked PR merge (branch protection), so `scripts/ci/generate-real-approval-manifest.mjs` resolves correctly no matter how long ago that merge happened.

## UTC cron, Nairobi editorial time

GitHub Actions `schedule: cron:` is always UTC - there is no way to configure it in local time. The workflow runs hourly, on the hour, UTC (`0 * * * *`).

Runtime Signals' editorial base is Nairobi (EAT, UTC+3, no daylight saving - the offset is constant year-round). When setting an article's `published_at` for a specific Nairobi wall-clock time, subtract 3 hours to get the UTC value to write in frontmatter:

| Intended Nairobi publish time | `published_at` (UTC, write this) |
| --- | --- |
| 09:00 EAT | `06:00Z` |
| 12:00 EAT (noon) | `09:00Z` |
| 18:00 EAT | `15:00Z` |

Because the check runs hourly, treat `published_at` as accurate to within the hour, not the minute - a piece scheduled for `06:00Z` goes live on the first tick at or after `06:00Z`, i.e. by `06:00Z`–`07:00Z`. Existing fixtures already follow this convention (e.g. `07:00Z` published_at values in `src/content/articles/`, corresponding to 10:00 EAT).

## Idempotency

Re-running the check with no new content due is a safe no-op: `scripts/ci/schedule-decision.mjs`'s `shouldTriggerDeploy` only returns true when at least one `scheduled` item's `published_at` falls strictly after the watermark and at or before now. No watermark advance, no new due content, no dispatch - most hourly ticks do nothing. This is unit tested (`tests/unit/schedule-decision.test.ts`) and was validated at the design stage by `docs/poc/scheduled-publish/idempotency.mjs`, which proves rerunning the build logic at a later time with no content change produces an identical output hash.

## Missed runs and retries

The watermark used each tick is the **last successful** run's start time, read from the GitHub Actions API (`scripts/ci/run-scheduled-publish.mjs`) - not "now minus one hour." This is what makes a missed run self-healing: if a run fails, or GitHub Actions itself has an outage for a few hours, the watermark simply doesn't advance. The next successful run's window is wider by exactly however long the gap was, so it naturally catches everything that should have gone live during the gap. No separate retry queue or missed-run bookkeeping exists or is needed.

To force an immediate check without waiting for the next hourly tick (e.g. after fixing a failure, or to verify a scheduling change), dispatch the workflow manually: **Actions → scheduled-publish → Run workflow**, or `gh workflow run scheduled-publish.yml`.

The very first time this workflow ever runs successfully, there is no prior successful run to read a watermark from. It falls back to a 3-hour bootstrap lookback (comfortably wider than the hourly cadence) rather than either publishing nothing or scanning all history.

## Rollback

If a dispatched `deploy.yml` run's build or verification steps fail, nothing changes - the previous deployment stays live, because Cloudflare Workers Static Assets only serves a new version once a deploy actually succeeds and is promoted. There is no in-between "half-deployed" state to roll back from.

If a *deployed* version turns out to be bad after the fact, rolling back to a previous Cloudflare Workers deployment (`wrangler rollback` or the dashboard's deployment history) is the intended mechanism - this is untested and unexercised so far, same as the rest of real (non-dry-run) deployment: no Cloudflare account or API token has been configured for this project at any point (see `docs/research/architecture-research-report.md`). This is tracked as part of the same real-deployment launch blocker, not a gap specific to scheduling.

## Audit trail

Every run - whether it dispatches a deploy or not - uploads a `schedule-audit-<run-id>` artifact (90-day retention) recording the watermark used, the current time, which content keys (if any) were found newly due, and whether a deploy was triggered. `if: always()` ensures this uploads even when the run fails, so a missed or broken run still leaves a record of what it was working from.
