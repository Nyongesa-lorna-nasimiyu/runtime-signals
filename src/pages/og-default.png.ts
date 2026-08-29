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
  // See src/pages/og/[...slug].png.ts for why no Cache-Control is set here —
  // it's inert for a static response; the real policy is in public/_headers.
  // Unlike the per-article images, this URL is never content-versioned (it's
  // not tied to a single content entry), so it gets a short revalidating
  // policy there, not `immutable` — its bytes DO change across a redeploy even
  // though the URL stays the same.
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
