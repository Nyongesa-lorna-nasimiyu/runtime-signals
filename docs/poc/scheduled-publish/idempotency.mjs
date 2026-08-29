import { createHash } from 'node:crypto';
import { canPublish } from '../publication-gate/validate.mjs';

// Simulates the "evaluate status + published_at <= now, then build" step in the
// scheduled-publication sequence (docs/architecture/data-flows.md). It must be a
// pure function of (records, approvalManifest, now): rerunning the scheduled
// build for the same commit at a later moment, with no content or approval
// change, must produce an identical artifact hash so a redeploy is a safe
// no-op, not a duplicate publish.
//
// The hash covers the full deterministic build output per record - not just
// canonical/published_at identity - because editing a title, body, sources, or
// correction note without changing the publish timestamp must change the hash
// and trigger a redeploy. `content_digest` stands in for the real hash Astro
// would produce over the rendered article (title, body, sources, claims,
// revision_note); this POC does not render HTML, so it is supplied by the
// fixture rather than computed here.
export function buildSnapshot(records, approvalManifest, now = new Date()) {
  const published = records
    .filter((record) => canPublish(record, approvalManifest, now))
    .map((record) => ({
      canonical: record.canonical,
      published_at: record.published_at,
      content_digest: record.content_digest,
      approved_commit_sha: record.commit_sha,
    }))
    .sort((a, b) => a.canonical.localeCompare(b.canonical));

  const hash = createHash('sha256').update(JSON.stringify(published)).digest('hex');
  return { records: published, hash };
}
