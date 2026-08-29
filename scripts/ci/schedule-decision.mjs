// Pure decision logic for the scheduled-publish workflow - separated from the
// GitHub API and frontmatter-scanning I/O in scripts/ci/run-scheduled-publish.mjs
// so it's directly unit testable (tests/unit/schedule-decision.test.ts), the
// same pure/IO split as scripts/ci/github-checks.mjs.

/**
 * Content newly due to go live since the watermark: status 'scheduled' with
 * published_at in (watermark, now]. Content already live before the
 * watermark isn't "newly due" - a scheduled-publish tick only cares about
 * the delta since its last successful run, not the whole live set (that's
 * src/lib/publication.ts's getPublishedEntries, evaluated fresh at build
 * time regardless of what triggered the build).
 *
 * The watermark is the last successful run's timestamp, not "now minus the
 * cron interval" - this is what makes a missed run (an outage, a failed
 * run) self-healing: the next successful run's window is simply wider,
 * automatically covering whatever the gap missed, with no separate retry
 * bookkeeping needed.
 */
export function contentDueSince(records, watermark, now) {
  return records.filter(
    (r) => r.status === 'scheduled' && r.published_at > watermark && r.published_at <= now,
  );
}

/** True if this tick should trigger a rebuild+redeploy. */
export function shouldTriggerDeploy(records, watermark, now) {
  return contentDueSince(records, watermark, now).length > 0;
}
