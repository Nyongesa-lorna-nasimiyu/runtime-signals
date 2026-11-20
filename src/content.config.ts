import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { findClaimsMissingSources } from './lib/claims';

// publication_state - the only reader-facing lifecycle. See
// docs/architecture/content-model.md ("Two state machines"). There is no `approved`
// value here: authorization is never a frontmatter field. It comes only from the
// build-time approval manifest cross-checked in src/lib/approval.ts against each
// file's actual git commit SHA - a value this schema deliberately does not accept
// from frontmatter, because anything accepted here is author-controlled.
const publicationState = z.enum(['draft', 'scheduled', 'published', 'archived']);

const evidenceStrength = z.enum(['supported', 'mixed', 'inference', 'opinion']);

const claim = z.object({
  id: z.string(),
  text: z.string().min(1),
  evidence: evidenceStrength,
  sources: z.array(reference('sources')).default([]),
});

const seo = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    noindex: z.boolean().default(false),
  })
  .default({ noindex: false });

// A revision is a real, dated event after initial publication - not a single
// "last updated" field. docs/architecture/content-model.md: "a correction does
// not erase history: it creates a revision record, keeps the stable URL, and
// adds a visible correction note." `type` distinguishes a factual correction
// (something was wrong) from a routine update (something was added/refreshed) -
// docs/corrections.astro and docs/editorial-policy.astro both describe this as
// a real distinction, not just two labels for the same thing. published_at
// already anchors "when this first went live," so revisions[] holds only
// what happened after that - an article with no revisions has never been
// touched since it published.
const revision = z.object({
  date: z.coerce.date(),
  note: z.string().min(1),
  type: z.enum(['correction', 'update']).default('update'),
});

// Shared shape for articles and briefs - both are long-form, reviewed, cited
// editorial content per docs/architecture/content-model.md's entity inventory.
const editorialFields = {
  title: z.string().min(1),
  dek: z.string().min(1),
  status: publicationState,
  authors: z.array(reference('authors')).min(1),
  topics: z.array(reference('topics')).min(1),
  series: z.array(reference('series')).default([]),
  published_at: z.coerce.date(),
  revisions: z.array(revision).default([]),
  reading_time_minutes: z.number().int().positive(),
  hero: z.string().optional(),
  canonical_url: z.url().optional(),
  claims: z.array(claim).default([]),
  citations: z.array(reference('sources')).default([]),
  artifacts: z.array(reference('artifacts')).default([]),
  related: z.array(reference('articles')).max(3).default([]),
  seo,
};

// A claim labeled `supported` or `mixed` asserts evidence exists; enforce that at
// schema level rather than trusting authors to remember, per
// docs/editorial/source-policy.md ("every consequential factual claim has a source
// record or is explicitly marked as inference/opinion").
function requireSourcesForStrongClaims(
  data: { claims: z.infer<typeof claim>[] },
  ctx: z.RefinementCtx,
) {
  for (const c of findClaimsMissingSources(data.claims)) {
    ctx.addIssue({
      code: 'custom',
      message: `Claim "${c.id}" is labeled "${c.evidence}" but cites no sources. Add a source, or change evidence to "inference" or "opinion".`,
      path: ['claims'],
    });
  }
}

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z
    .object({
      ...editorialFields,
      kind: z.enum(['article', 'deep-dive', 'tutorial', 'case-study']).default('article'),
    })
    .superRefine(requireSourcesForStrongClaims),
});

const briefs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/briefs' }),
  schema: z.object(editorialFields).superRefine(requireSourcesForStrongClaims),
});

const authors = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/authors' }),
  schema: z.object({
    name: z.string().min(1),
    bio: z.string().min(1),
    expertise: z.array(z.string()).default([]),
    links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
    disclosure: z.string().optional(),
  }),
});

const topics = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/topics' }),
  schema: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    related: z.array(reference('topics')).default([]),
    pillar: z.boolean().default(false),
  }),
});

const series = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/series' }),
  schema: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    order: z.array(reference('articles')).default([]),
  }),
});

// This is the published, reader-facing source record (used for citations and
// /sources/{slug} pages) - a smaller shape than the pre-publication research
// source card in docs/editorial/workflow.md, which tracks discovery/dedupe state
// in GitHub issues, not this collection.
const sources = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/sources' }),
  schema: z.object({
    title: z.string().min(1),
    url: z.url(),
    publisher: z.string().min(1),
    published_at: z.coerce.date().optional(),
    accessed_at: z.coerce.date(),
    source_type: z.enum([
      'paper',
      'report',
      'repository',
      'benchmark',
      'dataset',
      'tool',
      'case-study',
      'standard',
      'blog-post',
    ]),
    primary: z.boolean(),
    notes: z.string().optional(),
  }),
});

const artifacts = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/artifacts' }),
  schema: z.object({
    title: z.string().min(1),
    kind: z.enum(['repository', 'notebook', 'simulation', 'checklist', 'dataset']),
    url: z.url(),
    description: z.string().min(1),
  }),
});

export const collections = { articles, briefs, authors, topics, series, sources, artifacts };
