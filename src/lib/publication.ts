import type { CollectionEntry } from 'astro:content';
import { isApproved, loadApprovalManifest, type ApprovalManifest } from './approval';

type Editorial = CollectionEntry<'articles'> | CollectionEntry<'briefs'>;

/**
 * publication_state content-shape and timing check only - status and
 * published_at <= now. This is deliberately independent of authorization; see
 * canPublish() below and docs/architecture/content-model.md ("Two state machines").
 * `scheduled` content becomes live once its time passes without any write-back to
 * frontmatter, the same rule proven idempotent in
 * docs/poc/scheduled-publish/idempotency.test.mjs.
 */
export function isPubliclyLive<T extends Editorial>(entry: T, now: Date = new Date()): boolean {
  if (entry.data.status === 'published') return true;
  if (entry.data.status === 'scheduled') return entry.data.published_at <= now;
  return false; // draft, archived
}

/** Archived content keeps its stable URL (see docs/editorial/publication-gates.md,
 * "Emergency unpublish": a correction/retirement is a state change, not a deletion)
 * but is never live/promoted. */
export function isArchived<T extends Editorial>(entry: T): boolean {
  return entry.data.status === 'archived';
}

/** A URL should exist at all - live or archived - but never for draft or
 * not-yet-due scheduled content. This is the boundary getStaticPaths uses. */
export function isRoutable<T extends Editorial>(entry: T, now: Date = new Date()): boolean {
  return isPubliclyLive(entry, now) || isArchived(entry);
}

/**
 * The full publication gate: content is shaped and timed correctly (isPubliclyLive)
 * AND a CI approval-manifest entry authorizes the exact commit (isApproved). Neither
 * check alone is sufficient - see docs/poc/publication-gate/validate.test.mjs for
 * the property tests this mirrors.
 */
export function canPublish<T extends Editorial>(
  entry: T,
  manifest: ApprovalManifest = loadApprovalManifest(),
  now: Date = new Date(),
): boolean {
  return isPubliclyLive(entry, now) && isApproved(entry, manifest);
}

/** The active, promotable set: home feed, listings, RSS/Atom, sitemap priority,
 * search index. Draft, not-yet-due, unapproved, and archived content is excluded. */
export function getPublishedEntries<T extends Editorial>(
  entries: T[],
  now: Date = new Date(),
): T[] {
  const manifest = loadApprovalManifest();
  return entries
    .filter((entry) => canPublish(entry, manifest, now))
    .sort((a, b) => b.data.published_at.getTime() - a.data.published_at.getTime());
}

/** Every entry that should render a real page at all: the active set plus archived
 * entries (which keep resolving, with an archived notice, but drop out of feeds). */
export function getRoutableEntries<T extends Editorial>(entries: T[], now: Date = new Date()): T[] {
  const manifest = loadApprovalManifest();
  return entries.filter(
    (entry) =>
      canPublish(entry, manifest, now) || (isArchived(entry) && isApproved(entry, manifest)),
  );
}
