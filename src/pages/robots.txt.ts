import type { APIContext } from 'astro';

export function GET(context: APIContext) {
  const site = context.site ?? new URL('https://runtimesignals.tech');
  // Belt-and-suspenders alongside BaseLayout.astro's per-page noindex meta
  // tag: a PR preview build (PREVIEW_BUILD=true) must never be crawlable at
  // all, site-wide, regardless of what any individual page says.
  if (process.env.PREVIEW_BUILD === 'true') {
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  const body = `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', site).toString()}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
