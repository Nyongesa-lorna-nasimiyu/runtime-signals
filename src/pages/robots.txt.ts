import type { APIContext } from 'astro';

export function GET(context: APIContext) {
  const site = context.site ?? new URL('https://runtimesignals.tech');
  const body = `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', site).toString()}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
