import type { CollectionEntry } from 'astro:content';
import { BUILD_TIME } from './build-time';
import { getPublishedEntries } from './publication';

type Article = CollectionEntry<'articles'>;
type Editorial = Article | CollectionEntry<'briefs'>;
type Series = CollectionEntry<'series'>;

export interface RelatedContent {
  curated: Article[];
  seriesNext?: Article;
  fallback: Article[];
}

function referenceId(reference: { id: string }): string {
  return reference.id;
}

export function getRelatedContent(
  current: Editorial,
  allArticles: Article[],
  allSeries: Series[],
): RelatedContent {
  const articlesById = new Map(allArticles.map((article) => [article.id, article]));
  const seriesById = new Map(allSeries.map((series) => [series.id, series]));
  const liveArticles = getPublishedEntries(allArticles, BUILD_TIME);
  const liveArticleIds = new Set(liveArticles.map((article) => article.id));
  const isCurrent = (article: Article) =>
    current.collection === 'articles' && article.id === current.id;
  const isEligible = (article: Article) => liveArticleIds.has(article.id) && !isCurrent(article);

  const curated: Article[] = [];
  const curatedIds = new Set<string>();
  for (const relatedReference of current.data.related) {
    const article = articlesById.get(referenceId(relatedReference));
    if (!article || !isEligible(article) || curatedIds.has(article.id)) continue;
    curated.push(article);
    curatedIds.add(article.id);
  }

  let seriesNext: Article | undefined;
  if (current.collection === 'articles') {
    for (const seriesReference of current.data.series) {
      const declaredSeries = seriesById.get(referenceId(seriesReference));
      if (!declaredSeries) continue;

      const currentIndex = declaredSeries.data.order.findIndex(
        (articleReference) => referenceId(articleReference) === current.id,
      );
      if (currentIndex === -1) continue;

      for (const articleReference of declaredSeries.data.order.slice(currentIndex + 1)) {
        const article = articlesById.get(referenceId(articleReference));
        if (!article || !isEligible(article) || curatedIds.has(article.id)) continue;
        seriesNext = article;
        break;
      }
      break;
    }
  }

  const excludedIds = new Set(curatedIds);
  if (current.collection === 'articles') excludedIds.add(current.id);
  if (seriesNext) excludedIds.add(seriesNext.id);

  const currentTopicIds = new Set(current.data.topics.map(referenceId));
  const fallbackLimit = Math.max(0, 3 - curated.length);
  const fallback = liveArticles
    .filter((article) => !excludedIds.has(article.id))
    .map((article) => ({
      article,
      sharedTopics: article.data.topics.filter((topic) => currentTopicIds.has(referenceId(topic)))
        .length,
    }))
    .filter(({ sharedTopics }) => sharedTopics > 0)
    .sort((a, b) => {
      if (b.sharedTopics !== a.sharedTopics) return b.sharedTopics - a.sharedTopics;
      const publishedDifference =
        b.article.data.published_at.getTime() - a.article.data.published_at.getTime();
      if (publishedDifference !== 0) return publishedDifference;
      return a.article.id < b.article.id ? -1 : a.article.id > b.article.id ? 1 : 0;
    })
    .slice(0, fallbackLimit)
    .map(({ article }) => article);

  return { curated, seriesNext, fallback };
}
