/**
 * A single frozen instant for one entire build. Every page, feed, and the
 * sitemap must agree on "now" - each of src/lib/publication.ts's functions
 * defaults `now` to `new Date()` independently, so before this existed, a
 * static build spanning many pages could let a piece scheduled to go live
 * mid-build appear in some outputs (e.g. rss.xml, rendered early) but not
 * others (e.g. the homepage, rendered a few seconds later), silently
 * breaking the single-snapshot guarantee
 * docs/poc/scheduled-publish/idempotency.mjs's tests assume.
 *
 * SOURCE_DATE_EPOCH (seconds since epoch, the same env var reproducible-build
 * tooling already uses for this purpose) lets CI pin build time exactly -
 * used by scripts/verify-build-time-consistency.mjs and the scheduled-publish
 * decision script, which both need to reason about "what would this build
 * consider live at this exact instant" without racing the real clock.
 */
export const BUILD_TIME: Date = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000)
  : new Date();
