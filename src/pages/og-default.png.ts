import type { APIRoute } from 'astro';
import { renderOgImage } from '@/lib/og-image';

// The generic image for every non-article page (home, topic/series/author
// listings, policy pages) that doesn't have its own title-driven OG image.
export const GET: APIRoute = async () => {
  const png = await renderOgImage({
    eyebrow: "A publication about running AI agents like they'll fail",
    title: 'Systems analysis for AI agents in production',
    seed: 7,
  });
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
