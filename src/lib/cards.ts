import type { CollectionEntry } from 'astro:content';
import { articlePath, evidenceCounts, resolveTopicNames, weakestEvidence } from './resolve';

export type Editorial = CollectionEntry<'articles'> | CollectionEntry<'briefs'>;

/** The common shape every ArticleCard consumer needs. Keeping this in one
 * place means topic hubs, source pages, author pages, and related-content
 * lists all show the same kind/reading-time/evidence metadata. */
export async function buildEntryCard(entry: Editorial) {
  return {
    id: entry.id,
    path: articlePath(entry),
    title: entry.data.title,
    dek: entry.data.dek,
    publishedAt: entry.data.published_at,
    topics: await resolveTopicNames(entry),
    topicIds: entry.data.topics.map((topic) => topic.id),
    kind: entry.collection === 'briefs' ? 'brief' : entry.data.kind,
    readingTimeMinutes: entry.data.reading_time_minutes,
    dominantEvidence: weakestEvidence(entry),
    evidence: evidenceCounts([entry]),
    claimCount: entry.data.claims.length,
  };
}

export function buildEntryCards(entries: Editorial[]) {
  return Promise.all(entries.map(buildEntryCard));
}
