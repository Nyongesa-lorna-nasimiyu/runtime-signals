import type { CollectionEntry } from 'astro:content';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/approval', () => ({
  isApproved: vi.fn(() => true),
  loadApprovalManifest: vi.fn(() => ({})),
}));

import { getRelatedContent } from '@/lib/related';

type Article = CollectionEntry<'articles'>;
type Series = CollectionEntry<'series'>;
type Status = 'draft' | 'scheduled' | 'published' | 'archived';

function reference(id: string) {
  return { id };
}

function article(
  id: string,
  overrides: {
    status?: Status;
    topics?: string[];
    series?: string[];
    related?: string[];
    publishedAt?: string;
  } = {},
): Article {
  const {
    status = 'published',
    topics = ['reliability'],
    series = [],
    related = [],
    publishedAt = '2026-08-01T00:00:00Z',
  } = overrides;

  return {
    id,
    collection: 'articles',
    data: {
      title: id,
      dek: id,
      status,
      authors: [],
      topics: topics.map(reference),
      series: series.map(reference),
      published_at: new Date(publishedAt),
      revisions: [],
      reading_time_minutes: 1,
      related: related.map(reference),
      seo: { noindex: false },
      claims: [],
      citations: [],
      artifacts: [],
    },
  } as unknown as Article;
}

function series(id: string, order: string[]): Series {
  return {
    id,
    collection: 'series',
    data: {
      name: id,
      description: id,
      order: order.map(reference),
    },
  } as unknown as Series;
}

describe('getRelatedContent', () => {
  it('preserves curated order while removing duplicate and missing references', () => {
    const current = article('current', {
      related: ['third', 'first', 'third', 'missing'],
    });
    const first = article('first');
    const third = article('third');

    const result = getRelatedContent(current, [current, first, third], []);

    expect(result.curated.map((entry) => entry.id)).toEqual(['third', 'first']);
  });

  it('fills the remaining slots with ranked fallback articles and caps the total at three', () => {
    const current = article('current', {
      topics: ['reliability', 'orchestration'],
      related: ['curated'],
    });
    const curated = article('curated', { topics: ['security'] });
    const olderHighOverlap = article('older-high-overlap', {
      topics: ['reliability', 'orchestration'],
      publishedAt: '2026-01-01T00:00:00Z',
    });
    const newerHighOverlap = article('newer-high-overlap', {
      topics: ['reliability', 'orchestration'],
      publishedAt: '2026-02-01T00:00:00Z',
    });
    const newerLowOverlap = article('newer-low-overlap', {
      topics: ['reliability'],
      publishedAt: '2026-03-01T00:00:00Z',
    });

    const result = getRelatedContent(
      current,
      [current, curated, olderHighOverlap, newerHighOverlap, newerLowOverlap],
      [],
    );

    expect(result.curated.map((entry) => entry.id)).toEqual(['curated']);
    expect(result.fallback.map((entry) => entry.id)).toEqual([
      'newer-high-overlap',
      'older-high-overlap',
    ]);
    expect(result.curated.length + result.fallback.length).toBe(3);
  });

  it('uses the first eligible article after the current article in its declared series', () => {
    const current = article('current', {
      related: ['curated-next'],
      series: ['missing-series', 'reliability-series'],
    });
    const curatedNext = article('curated-next');
    const draftNext = article('draft-next', { status: 'draft' });
    const futureNext = article('future-next', {
      status: 'scheduled',
      publishedAt: '2099-01-01T00:00:00Z',
    });
    const next = article('next');

    const result = getRelatedContent(
      current,
      [current, curatedNext, draftNext, futureNext, next],
      [
        series('reliability-series', [
          'before',
          'current',
          'curated-next',
          'draft-next',
          'future-next',
          'next',
        ]),
      ],
    );

    expect(result.seriesNext?.id).toBe('next');
  });

  it('excludes the current article and non-live articles from curated and fallback results', () => {
    const current = article('current', {
      topics: ['reliability'],
      related: ['current', 'draft', 'future', 'archived', 'curated-live'],
    });
    const draft = article('draft', { status: 'draft' });
    const future = article('future', {
      status: 'scheduled',
      publishedAt: '2099-01-01T00:00:00Z',
    });
    const archived = article('archived', { status: 'archived' });
    const curatedLive = article('curated-live');
    const fallbackLive = article('fallback-live');

    const result = getRelatedContent(
      current,
      [current, draft, future, archived, curatedLive, fallbackLive],
      [],
    );

    expect(result.curated.map((entry) => entry.id)).toEqual(['curated-live']);
    expect(result.fallback.map((entry) => entry.id)).toEqual(['fallback-live']);
  });
});
