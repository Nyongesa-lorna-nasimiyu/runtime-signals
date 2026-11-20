import { getEntries } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

type Editorial = CollectionEntry<'articles'> | CollectionEntry<'briefs'>;

export async function resolveTopicNames(entry: Editorial): Promise<string[]> {
  if (entry.data.topics.length === 0) return [];
  const topics = await getEntries(entry.data.topics);
  return topics.map((t) => t.data.name);
}

/** Topic IDs paired with names - article headers and archive filters need the
 * stable slug for links, not just the display label. */
export async function resolveTopicItems(entry: Editorial): Promise<{ id: string; name: string }[]> {
  if (entry.data.topics.length === 0) return [];
  const topics = await getEntries(entry.data.topics);
  return topics.map((t) => ({ id: t.id, name: t.data.name }));
}

export interface SourceSummary {
  id: string;
  title: string;
  url: string;
  sourceType: string;
  primary: boolean;
  publisher: string;
  accessedAt: Date;
  notes?: string;
}

export async function resolveSourceSummaries(entry: Editorial): Promise<SourceSummary[]> {
  if (entry.data.citations.length === 0) return [];
  const sources = await getEntries(entry.data.citations);
  return sources.map((s) => ({
    id: s.id,
    title: s.data.title,
    url: s.data.url,
    sourceType: s.data.source_type,
    primary: s.data.primary,
    publisher: s.data.publisher,
    accessedAt: s.data.accessed_at,
    notes: s.data.notes,
  }));
}

export interface ArtifactSummary {
  id: string;
  title: string;
  url: string;
  kind: string;
  description: string;
}

export async function resolveArtifactSummaries(entry: Editorial): Promise<ArtifactSummary[]> {
  if (entry.data.artifacts.length === 0) return [];
  const artifacts = await getEntries(entry.data.artifacts);
  return artifacts.map((a) => ({
    id: a.id,
    title: a.data.title,
    url: a.data.url,
    kind: a.data.kind,
    description: a.data.description,
  }));
}

export async function resolveAuthorNames(entry: Editorial): Promise<string[]> {
  const authors = await getEntries(entry.data.authors);
  return authors.map((a) => a.data.name);
}

export async function resolveSeries(entry: Editorial): Promise<{ id: string; name: string }[]> {
  if (entry.data.series.length === 0) return [];
  const series = await getEntries(entry.data.series);
  return series.map((s) => ({ id: s.id, name: s.data.name }));
}

const STRENGTH_ORDER = ['supported', 'mixed', 'inference', 'opinion'] as const;
export type EvidenceStrength = (typeof STRENGTH_ORDER)[number];

/** The weakest-backed claim on the piece - a conservative signal to surface on a
 * card, in keeping with docs/editorial/source-policy.md's evidence-first stance. */
export function weakestEvidence(entry: Editorial): EvidenceStrength | undefined {
  let weakest: EvidenceStrength | undefined;
  for (const claim of entry.data.claims) {
    if (!weakest || STRENGTH_ORDER.indexOf(claim.evidence) > STRENGTH_ORDER.indexOf(weakest)) {
      weakest = claim.evidence;
    }
  }
  return weakest;
}

/** Raw claim-evidence tally across one or more entries, in STRENGTH_ORDER -
 * feeds the EvidenceStrip component, which renders this distribution
 * directly rather than a decorative stand-in for it. */
export function evidenceCounts(entries: Editorial[]): Record<EvidenceStrength, number> {
  const counts: Record<EvidenceStrength, number> = {
    supported: 0,
    mixed: 0,
    inference: 0,
    opinion: 0,
  };
  for (const entry of entries) {
    for (const claim of entry.data.claims) {
      counts[claim.evidence]++;
    }
  }
  return counts;
}

export function articlePath(entry: Editorial): string {
  return entry.collection === 'articles' ? `/articles/${entry.id}` : `/brief/${entry.id}`;
}

/** The most recent real event for this piece - its latest revision, or its
 * original publish date if it has never been revised since. Used anywhere
 * "last modified" matters (RSS/Atom `updated`, JSON-LD dateModified, the
 * OG-image cache-busting version): src/content.config.ts's `revisions[]`
 * only holds post-publication events, so published_at is the correct anchor
 * when that array is empty. */
export function latestRevisionDate(entry: Editorial): Date {
  // Seeded with published_at (not revisions[0], which noUncheckedIndexedAccess
  // correctly flags as possibly undefined for an empty array) - any real
  // revision necessarily postdates publication, so this is equally correct
  // and needs no length check or array access at all.
  return entry.data.revisions.reduce(
    (latest, r) => (r.date > latest ? r.date : latest),
    entry.data.published_at,
  );
}
