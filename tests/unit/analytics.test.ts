import { describe, it, expect } from 'vitest';
import {
  track,
  initEngagedRead,
  ENGAGED_READ_SAMPLE_RATE,
  ENGAGED_READ_MIN_MS,
  ENGAGED_READ_MIN_DEPTH,
} from '@/lib/analytics';

describe('track', () => {
  it('never throws, even with no window/document (this test environment)', () => {
    expect(() =>
      track({ name: 'article_view', properties: { slug: 'x', topics: [] } }),
    ).not.toThrow();
  });

  it('accepts every event shape the contract defines without throwing', () => {
    expect(() => track({ name: 'engaged_read', properties: { slug: 'x' } })).not.toThrow();
    expect(() => track({ name: 'search_submit', properties: { resultCount: 3 } })).not.toThrow();
    expect(() => track({ name: 'artifact_open', properties: { artifactId: 'x' } })).not.toThrow();
    expect(() => track({ name: 'newsletter_cta', properties: {} })).not.toThrow();
    expect(() => track({ name: 'business_cta', properties: { ctaId: 'x' } })).not.toThrow();
  });
});

describe('initEngagedRead', () => {
  it('no-ops without throwing when there is no document (this test environment, node)', () => {
    expect(() => initEngagedRead('some-slug')).not.toThrow();
  });
});

describe('engaged_read thresholds (ADR-0003: "time-plus-depth threshold... sampled, without an identity")', () => {
  it('samples less than the full population, not every reader', () => {
    expect(ENGAGED_READ_SAMPLE_RATE).toBeGreaterThan(0);
    expect(ENGAGED_READ_SAMPLE_RATE).toBeLessThan(1);
  });

  it('requires a real minimum dwell time, not an instant trigger', () => {
    expect(ENGAGED_READ_MIN_MS).toBeGreaterThanOrEqual(10_000);
  });

  it('requires meaningful scroll depth, not just any intersection', () => {
    expect(ENGAGED_READ_MIN_DEPTH).toBeGreaterThan(0);
    expect(ENGAGED_READ_MIN_DEPTH).toBeLessThanOrEqual(1);
  });
});
