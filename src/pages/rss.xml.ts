import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { getPublishedEntries } from '@/lib/publication';
import { articlePath } from '@/lib/resolve';
import { BUILD_TIME } from '@/lib/build-time';

export async function GET(context: APIContext) {
  const [articles, briefs] = await Promise.all([
    getCollection('articles'),
    getCollection('briefs'),
  ]);
  const live = getPublishedEntries([...articles, ...briefs], BUILD_TIME);

  return rss({
    title: 'Runtime Signals',
    description:
      'Systems analysis of evaluation, reliability, recovery, orchestration, state, memory, tool security, and observability for AI agents in production.',
    site: context.site ?? 'https://runtimesignals.tech',
    items: live.map((entry) => ({
      title: entry.data.title,
      description: entry.data.dek,
      pubDate: entry.data.published_at,
      link: articlePath(entry),
    })),
  });
}
