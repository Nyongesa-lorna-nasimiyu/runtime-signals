import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { getPublishedEntries } from '@/lib/publication';
import { articlePath } from '@/lib/resolve';
import { absoluteUrl } from '@/lib/seo';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(_context: APIContext) {
  const [articles, briefs] = await Promise.all([
    getCollection('articles'),
    getCollection('briefs'),
  ]);
  const live = getPublishedEntries([...articles, ...briefs]);
  const updated = live[0]?.data.published_at.toISOString() ?? new Date(0).toISOString();

  const entries = live
    .map(
      (entry) => `
  <entry>
    <title>${escapeXml(entry.data.title)}</title>
    <link href="${absoluteUrl(articlePath(entry))}" />
    <id>${absoluteUrl(articlePath(entry))}</id>
    <updated>${(entry.data.updated_at ?? entry.data.published_at).toISOString()}</updated>
    <published>${entry.data.published_at.toISOString()}</published>
    <summary>${escapeXml(entry.data.dek)}</summary>
  </entry>`,
    )
    .join('');

  const body = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Runtime Signals</title>
  <link href="${absoluteUrl('/atom.xml')}" rel="self" />
  <link href="${absoluteUrl('/')}" />
  <id>${absoluteUrl('/')}</id>
  <updated>${updated}</updated>${entries}
</feed>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
}
