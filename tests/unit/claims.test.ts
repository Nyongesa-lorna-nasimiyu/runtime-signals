import { describe, it, expect } from 'vitest';
import { findClaimsMissingSources } from '@/lib/claims';

describe('findClaimsMissingSources', () => {
  it('flags a supported claim with no sources', () => {
    const result = findClaimsMissingSources([{ id: 'a', evidence: 'supported', sources: [] }]);
    expect(result).toHaveLength(1);
  });

  it('flags a mixed claim with no sources', () => {
    const result = findClaimsMissingSources([{ id: 'a', evidence: 'mixed', sources: [] }]);
    expect(result).toHaveLength(1);
  });

  it('allows an inference claim with no sources', () => {
    const result = findClaimsMissingSources([{ id: 'a', evidence: 'inference', sources: [] }]);
    expect(result).toHaveLength(0);
  });

  it('allows an opinion claim with no sources', () => {
    const result = findClaimsMissingSources([{ id: 'a', evidence: 'opinion', sources: [] }]);
    expect(result).toHaveLength(0);
  });

  it('allows a supported claim that does cite a source', () => {
    const result = findClaimsMissingSources([
      { id: 'a', evidence: 'supported', sources: ['src-1'] },
    ]);
    expect(result).toHaveLength(0);
  });
});
