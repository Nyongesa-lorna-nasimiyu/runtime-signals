import { describe, it, expect } from 'vitest';
import {
  jaccardSimilarity,
  seoPreview,
  findPossibleDuplicates,
  findUnlinkedMentions,
  citationCoverage,
} from '../../scripts/ci/editorial-report.mjs';

describe('jaccardSimilarity', () => {
  it('is 1 for identical text', () => {
    expect(jaccardSimilarity('retry storms and idempotency', 'retry storms and idempotency')).toBe(
      1,
    );
  });

  it('is 0 for completely disjoint text', () => {
    expect(jaccardSimilarity('retry storms', 'model handoff contracts')).toBe(0);
  });

  it('is 0 when either input has no meaningful tokens', () => {
    expect(jaccardSimilarity('', 'retry storms')).toBe(0);
    expect(jaccardSimilarity('the a of', 'retry storms')).toBe(0);
  });

  it('is partial for overlapping-but-not-identical text', () => {
    const score = jaccardSimilarity(
      'retry storms and idempotency keys',
      'idempotency keys in practice',
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe('seoPreview', () => {
  it('flags a title that would truncate in search results', () => {
    const { warnings } = seoPreview({
      title: 'A Title So Extremely Long That It Will Definitely Truncate In Search Results',
      dek: 'A perfectly reasonable description of normal length for a search snippet.',
    });
    expect(warnings.some((w) => w.includes('Title'))).toBe(true);
  });

  it('flags a missing description', () => {
    const { warnings } = seoPreview({ title: 'Short title', dek: '' });
    expect(warnings.some((w) => w.includes('No seo.description'))).toBe(true);
  });

  it('flags a too-short description', () => {
    const { warnings } = seoPreview({ title: 'Short title', dek: 'Too short.' });
    expect(warnings.some((w) => w.includes('short'))).toBe(true);
  });

  it('has no warnings for a well-formed title and description', () => {
    const { warnings } = seoPreview({
      title: 'Retry storms and idempotency keys',
      dek: 'Why naive retries amplify load instead of recovering from it, and how idempotency keys fix that.',
    });
    expect(warnings).toEqual([]);
  });

  it('prefers seoDescription over dek when both are present', () => {
    const { description } = seoPreview({
      title: 'X',
      dek: 'the dek',
      seoDescription: 'the seo description',
    });
    expect(description).toBe('the seo description');
  });
});

describe('findPossibleDuplicates', () => {
  const target = {
    key: 'articles/new',
    title: 'Retry storms and idempotency keys',
    dek: 'Why naive retries amplify load.',
  };

  it('excludes the target itself even if present in the candidate list', () => {
    expect(findPossibleDuplicates(target, [target])).toEqual([]);
  });

  it('flags a highly similar existing piece', () => {
    const similar = {
      key: 'articles/old',
      title: 'Retry storms and idempotency',
      dek: 'Why naive retries amplify load on a struggling system.',
    };
    const results = findPossibleDuplicates(target, [similar]);
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('articles/old');
  });

  it('does not flag an unrelated piece', () => {
    const unrelated = {
      key: 'articles/unrelated',
      title: 'Model handoff as distributed state transfer',
      dek: 'A handoff between agent steps is a state boundary.',
    };
    expect(findPossibleDuplicates(target, [unrelated])).toEqual([]);
  });

  it('sorts multiple matches by score, highest first', () => {
    const closer = {
      key: 'articles/closer',
      title: 'Retry storms and idempotency keys explained',
      dek: '',
    };
    // Below the default 0.35 threshold on its own (~0.22) - passing an
    // explicit lower threshold here isolates "does sorting work" from "does
    // the default threshold work", which the earlier tests already cover.
    const further = { key: 'articles/further', title: 'Retry storms', dek: '' };
    const results = findPossibleDuplicates(target, [further, closer], 0.2);
    expect(results.map((r: { key: string }) => r.key)).toEqual([
      'articles/closer',
      'articles/further',
    ]);
  });
});

describe('findUnlinkedMentions', () => {
  const candidates = [
    { key: 'topics/reliability', title: 'reliability', path: '/topics/reliability' },
  ];

  it('suggests a link when the title appears as plain text', () => {
    const body = 'This piece is about reliability in distributed systems.';
    expect(findUnlinkedMentions(body, candidates)).toEqual(candidates);
  });

  it('does not suggest a link when already linked at that exact spot', () => {
    const body = 'This piece is about [reliability](/topics/reliability) in distributed systems.';
    expect(findUnlinkedMentions(body, candidates)).toEqual([]);
  });

  it('ignores candidates whose title never appears', () => {
    const body = 'This piece is about orchestration.';
    expect(findUnlinkedMentions(body, candidates)).toEqual([]);
  });

  it('skips candidates with very short titles to avoid noisy false positives', () => {
    const short = [{ key: 'x', title: 'ai', path: '/x' }];
    expect(findUnlinkedMentions('this is about ai systems', short)).toEqual([]);
  });
});

describe('citationCoverage', () => {
  it('handles zero claims without dividing by zero', () => {
    expect(citationCoverage([])).toEqual({
      total: 0,
      supported: 0,
      mixed: 0,
      inference: 0,
      opinion: 0,
      supportedRatio: null,
    });
  });

  it('tallies by evidence strength and computes the supported ratio', () => {
    const claims = [
      { evidence: 'supported' },
      { evidence: 'supported' },
      { evidence: 'inference' },
      { evidence: 'opinion' },
    ];
    const result = citationCoverage(claims);
    expect(result).toEqual({
      total: 4,
      supported: 2,
      mixed: 0,
      inference: 1,
      opinion: 1,
      supportedRatio: 0.5,
    });
  });
});
