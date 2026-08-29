export interface ClaimLike {
  id: string;
  evidence: 'supported' | 'mixed' | 'inference' | 'opinion';
  sources: unknown[];
}

/**
 * The actual business rule behind src/content.config.ts's schema refinement,
 * extracted so it's testable without going through zod/astro:content - see
 * tests/unit/claims.test.ts and docs/editorial/source-policy.md ("mark inference,
 * opinion, and unresolved claims explicitly ... publication gates reject unresolved
 * markers").
 */
export function findClaimsMissingSources<T extends ClaimLike>(claims: T[]): T[] {
  return claims.filter(
    (c) => (c.evidence === 'supported' || c.evidence === 'mixed') && c.sources.length === 0,
  );
}
