import { getEntries } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

type Editorial = CollectionEntry<'articles'> | CollectionEntry<'briefs'>;

export async function resolveTopicNames(entry: Editorial): Promise<string[]> {
  if (entry.data.topics.length === 0) return [];
  const topics = await getEntries(entry.data.topics);
  return topics.map((t) => t.data.name);
}

export async function resolveAuthorNames(entry: Editorial): Promise<string[]> {
  const authors = await getEntries(entry.data.authors);
  return authors.map((a) => a.data.name);
}

export async function resolveSeriesNames(entry: Editorial): Promise<string[]> {
  if (entry.data.series.length === 0) return [];
  const series = await getEntries(entry.data.series);
  return series.map((s) => s.data.name);
}

const STRENGTH_ORDER = ['supported', 'mixed', 'inference', 'opinion'] as const;

/** The weakest-backed claim on the piece — a conservative signal to surface on a
 * card, in keeping with docs/editorial/source-policy.md's evidence-first stance. */
export function weakestEvidence(entry: Editorial): (typeof STRENGTH_ORDER)[number] | undefined {
  let weakest: (typeof STRENGTH_ORDER)[number] | undefined;
  for (const claim of entry.data.claims) {
    if (!weakest || STRENGTH_ORDER.indexOf(claim.evidence) > STRENGTH_ORDER.indexOf(weakest)) {
      weakest = claim.evidence;
    }
  }
  return weakest;
}

export function articlePath(entry: Editorial): string {
  return entry.collection === 'articles' ? `/articles/${entry.id}` : `/brief/${entry.id}`;
}
