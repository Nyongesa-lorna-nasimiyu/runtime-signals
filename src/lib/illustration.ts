export interface Artwork {
  src: string;
  width: number;
  height: number;
}

const ARTWORK: Record<string, Artwork> = {
  observability: { src: '/images/card-observability-traces.webp', width: 1200, height: 896 },
  evaluation: { src: '/images/card-observability-traces.webp', width: 1200, height: 896 },
  security: { src: '/images/card-security-boundary.webp', width: 1200, height: 896 },
  state: { src: '/images/card-state-execution.webp', width: 1200, height: 896 },
  execution: { src: '/images/card-state-execution.webp', width: 1200, height: 896 },
  reliability: { src: '/images/card-state-execution.webp', width: 1200, height: 896 },
  orchestration: { src: '/images/card-state-execution.webp', width: 1200, height: 896 },
};

export const HERO_ARTWORK: Artwork = {
  src: '/images/hero-systems-architecture.webp',
  width: 1376,
  height: 768,
};

/** Pick a deterministic companion diagram for a piece from its first topic.
 * Authors can still override with the `hero` frontmatter field. */
export function artworkForTopics(topicIds: string[]): Artwork {
  for (const id of topicIds) {
    const artwork = ARTWORK[id];
    if (artwork) return artwork;
  }
  return HERO_ARTWORK;
}
