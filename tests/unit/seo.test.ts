import { describe, expect, it } from 'vitest';
import { documentTitle } from '@/lib/seo';

describe('documentTitle', () => {
  it('keeps short titles and the site suffix intact', () => {
    expect(documentTitle('Sources')).toBe('Sources - Runtime Signals');
  });

  it('truncates long titles without exceeding the 70-character contract', () => {
    const result = documentTitle(
      'When Truth Is Distributed: Misinformation Derails Collective Fact Recovery in LLM-Based Multi-Agent Systems',
    );

    expect(result).toHaveLength(70);
    expect(result).toMatch(/… - Runtime Signals$/);
  });
});
