# Content model

The model is relational in concepts but stored in Git-friendly files. Do not build a general-purpose knowledge graph in the first release.

## Entity inventory

| Entity | Storage | Purpose |
|---|---|---|
| Article | `content/articles/*.md` | Primary publication unit. |
| Note | `content/notes/*.md` | Short, explicitly provisional observation. |
| Brief | `content/briefs/*.md` | Weekly digest with linked source records. |
| Deep dive | Article subtype | Long implementation or experiment piece. |
| Tutorial | Article subtype | Stepwise build/use guide with tested artifacts. |
| Case study | Article subtype | Evidence from a real deployment or disclosed incident. |
| Author | `content/authors/*.yaml` | Byline, expertise, links, disclosure. |
| Topic | `content/topics/*.yaml` | Cluster, description, related topics, pillar flag. |
| Series | `content/series/*.yaml` | Ordered collection of articles. |
| Source | `content/sources/*.yaml` | Paper, report, repository, benchmark, dataset, tool, or case study. |
| Claim | article frontmatter/sidecar | Atomic assertion with evidence strength and source IDs. |
| Citation | source reference | Position-aware link to a source or quoted artifact. |
| Code artifact | `content/artifacts/*.yaml` | Repo, commit, notebook, simulation, or downloadable checklist. |
| Diagram | article block | Static SVG/PNG plus alt text, or allow-listed interactive component. |
| Revision | Git commit + frontmatter | Meaningful change note and timestamp. |

## Article frontmatter contract

```yaml
id: article.runtime-signals.example
kind: article # note | brief | deep-dive | tutorial | case-study
title: Treat model handoff as distributed state transfer
slug: model-handoff-as-distributed-state-transfer
dek: A handoff is a state boundary, not a prompt concatenation trick.
status: draft # scheduled | published | archived - see "Two state machines" below
authors: [author.primary]
topics: [orchestration, state]
series: [agent-reliability-patterns]
published_at: 2026-09-15T07:00:00Z
revisions: [] # each entry: { date, note, type: correction | update } - only post-publication events; an empty array means never revised since publishing
reading_time_minutes: 8
hero: null
canonical_url: null
claims:
  - id: claim.handoff.state-boundary
    text: A model handoff can lose hidden state unless the transfer contract is explicit.
    evidence: supported # supported | mixed | inference | opinion
    sources: [source.paper-or-doc]
citations: [source.paper-or-doc, source.provider-doc]
artifacts: [artifact.handoff-simulation]
related: [article.completion-vs-committed-success]
seo:
  title: Model handoff as distributed state transfer
  description: ...
  noindex: false
```

## Archive pagination and related articles

Archive pagination is a presentation and routing concern, not a content-model
relationship. The `/articles` and `/brief` indexes show page 1 with a page size
of 10, filtering to approved, currently live entries; overflow pages use
`/articles/page/{n}` and `/brief/page/{n}`. Topic, series, and author pages are
not paginated currently.

Each article or brief may declare up to three `related` references, typed as
`reference('articles')` in `src/content.config.ts`. At build time,
`src/lib/related.ts` resolves those references in declared order and filters
candidates through `getPublishedEntries`, so only live and approved articles
can appear. It excludes the current article and duplicates. For article detail
pages, the next eligible article is also selected from the referenced series'
`order` and rendered separately as “Continue the series”. Remaining related-
reading slots are filled with live articles sharing topics, ranked by shared
topic count descending, `published_at` descending, then article ID ascending;
this deterministic fallback fills the combined related-reading list to a
maximum of three cards.

The article and brief detail routes compute this result in `getStaticPaths` and
pass it to `ArticleLayout`. `RelatedContent.astro` renders non-empty series
continuation and related-reading sections as static article cards.

## Typed relationships

Use source IDs and relationship records, not a graph database:

- `supports_claim`
- `contradicts_claim`
- `derived_from`
- `implemented_by`
- `evaluated_on`
- `reproduced_by`
- `supersedes`
- `updated_by`
- `related_to`

Validate that relationship targets exist and that published claims have at least one primary source unless explicitly labeled inference/opinion.

## Two state machines

Earlier drafts of this document, `docs/editorial/workflow.md`, and the frontmatter example described overlapping states (`draft`, `in_review`, `approved`, `scheduled`, `published`, `updated`, `archived` in one place; `idea` through `archived` in another) with an undefined boundary between them. There are exactly two state machines, and neither one includes `approved`:

- **`publication_state`** (this document; stored in the `status` frontmatter field): `draft → scheduled → published → archived`. This is what the reader-facing site and the build care about. A material edit to a `published` article does not change its `publication_state` - it stays `published` and the edit is recorded as a revision (an entry appended to `revisions[]`, dated, noted, and typed `correction` or `update`), not a state transition. Moving `draft`/`scheduled` → `published`, or any transition into `published`, requires the separate authorization check below; it is never a function of the `status` field alone.
- **`editorial_state`** (`docs/editorial/workflow.md`; tracked in the GitHub issue/PR/project, not frontmatter): the research-and-review workflow, `idea → researching → source-verified → outlined → drafting → technical-review → editorial-review → editorial-complete`, then a post-publication loop of `monitoring → update-required → revised → technical-review`. This tracks *who is doing what and why*; it has no authority over what the site serves.

**Approval is neither state.** It is external CI evidence - protected-branch review, required check-run results, CODEOWNERS approval, and deployment-environment authorization, captured in a build-time approval manifest keyed by canonical URL and commit SHA (see `docs/editorial/publication-gates.md` and `docs/poc/publication-gate/validate.mjs`). `publication_state` can only advance into `published` when both `editorial_state` has reached `editorial-complete` *and* the approval manifest has a matching, fully-authorized entry for the exact commit being built. A `status: scheduled` frontmatter field expresses intent; it cannot grant permission.

A correction does not erase history: it creates a revision record, keeps the stable URL, and adds a visible correction note, all while `publication_state` remains `published`.
