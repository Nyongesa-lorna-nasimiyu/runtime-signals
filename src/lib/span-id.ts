// Deterministic, cosmetic-only identifier for an article/brief entry - an
// observability-flavored "span ID" (RS-014) shown next to a card/header title.
// Derived purely from the entry's slug (CollectionEntry#id), so it never
// touches frontmatter or the content schema, and stays stable across builds
// for a given slug. Not a real trace/span ID and not guaranteed collision-free
// (3 digits = 1000 buckets) - it's a visual motif, not an identity system.
const MODULUS = 1000;

/**
 * Reduces a string to a small, positive integer via a simple deterministic
 * hash (djb2-style), then formats it as a zero-padded 3-digit "RS-###" tag.
 */
export function spanId(id: string): string {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  }
  const bucket = hash % MODULUS;
  return `RS-${String(bucket).padStart(3, '0')}`;
}
