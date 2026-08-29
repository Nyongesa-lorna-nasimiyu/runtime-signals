import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getRoutableEntries } from '@/lib/publication';
import { resolveTopicNames } from '@/lib/resolve';
import { renderOgImage } from '@/lib/og-image';
import { BUILD_TIME } from '@/lib/build-time';

// One real OG image per routable article/brief, generated at build time (this
// is a static site — there is no request-time renderer to generate these on
// demand). Uses the same getRoutableEntries() boundary as the actual article
// pages, so a draft or unapproved piece can no more get an OG image than it
// can get a route. The path is prefixed with the collection name
// (/og/articles/{slug}.png, /og/brief/{slug}.png) — matching the real article
// URL structure — because articles and briefs are separate slug namespaces and
// a bare /og/{slug}.png could collide if both collections ever used the same id.
export async function getStaticPaths() {
  const [articles, briefs] = await Promise.all([
    getCollection('articles'),
    getCollection('briefs'),
  ]);
  const routable = getRoutableEntries([...articles, ...briefs], BUILD_TIME);
  return Promise.all(
    routable.map(async (entry) => {
      const topics = await resolveTopicNames(entry);
      const collectionSegment = entry.collection === 'articles' ? 'articles' : 'brief';
      return {
        params: { slug: `${collectionSegment}/${entry.id}` },
        props: { title: entry.data.title, eyebrow: topics.join(' · ') || entry.collection },
      };
    }),
  );
}

export const GET: APIRoute = async ({ props }) => {
  const { title, eyebrow } = props as { title: string; eyebrow: string };
  const png = await renderOgImage({ title, eyebrow, seed: title.length });
  // No headers set here beyond Content-Type: this Response is only used to
  // extract the PNG bytes for the static file Astro writes to dist/ at build
  // time — Cloudflare Workers Static Assets then serves that file with its own
  // headers, ignoring whatever this Response object specified (confirmed via a
  // real wrangler dev request: a Cache-Control set here never appeared on the
  // actual response). The real, effective cache policy lives in
  // public/_headers, the only mechanism that actually reaches production for a
  // static response — see the /og/* rule there.
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
