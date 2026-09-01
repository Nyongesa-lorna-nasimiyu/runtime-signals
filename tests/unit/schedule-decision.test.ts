import { describe, it, expect } from 'vitest';
import { contentDueSince, shouldTriggerDeploy } from '../../scripts/ci/schedule-decision.mjs';

function record(overrides: Partial<{ key: string; status: string; published_at: Date }> = {}) {
  return {
    key: 'articles/example',
    status: 'scheduled',
    published_at: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  };
}

const WATERMARK = new Date('2026-06-01T00:00:00Z');
const NOW = new Date('2026-06-01T01:00:00Z');

describe('contentDueSince', () => {
  it('includes scheduled content whose published_at falls in (watermark, now]', () => {
    const r = record({ published_at: new Date('2026-06-01T00:30:00Z') });
    expect(contentDueSince([r], WATERMARK, NOW)).toEqual([r]);
  });

  it('excludes content already due before the watermark (already handled by a prior tick)', () => {
    const r = record({ published_at: new Date('2026-05-31T00:00:00Z') });
    expect(contentDueSince([r], WATERMARK, NOW)).toEqual([]);
  });

  it('excludes content not yet due even after this tick', () => {
    const r = record({ published_at: new Date('2026-06-02T00:00:00Z') });
    expect(contentDueSince([r], WATERMARK, NOW)).toEqual([]);
  });

  it('excludes non-scheduled content regardless of published_at', () => {
    const r = record({ status: 'draft', published_at: new Date('2026-06-01T00:30:00Z') });
    expect(contentDueSince([r], WATERMARK, NOW)).toEqual([]);
  });

  it('is inclusive of the watermark boundary itself being excluded and now being included', () => {
    const atWatermark = record({ published_at: WATERMARK });
    const atNow = record({ key: 'articles/at-now', published_at: NOW });
    const due = contentDueSince([atWatermark, atNow], WATERMARK, NOW);
    expect(due.map((r: { key: string }) => r.key)).toEqual(['articles/at-now']);
  });

  it('a missed run is self-healing: a wider gap since the last success catches everything in between', () => {
    const missedDuringOutage = record({ published_at: new Date('2026-06-01T00:15:00Z') });
    const wideWatermark = new Date('2026-05-31T00:00:00Z'); // last success was a day ago
    expect(contentDueSince([missedDuringOutage], wideWatermark, NOW)).toEqual([missedDuringOutage]);
  });
});

describe('shouldTriggerDeploy', () => {
  it('is false when nothing is due', () => {
    const r = record({ published_at: new Date('2099-01-01') });
    expect(shouldTriggerDeploy([r], WATERMARK, NOW)).toBe(false);
  });

  it('is true when at least one item is due', () => {
    const r = record({ published_at: new Date('2026-06-01T00:30:00Z') });
    expect(shouldTriggerDeploy([r], WATERMARK, NOW)).toBe(true);
  });
});
