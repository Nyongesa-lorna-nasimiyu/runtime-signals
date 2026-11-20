# ADR-0001: Static search with Pagefind

- Status: Accepted
- Date: 2026-08-28 (accepted 2026-08-28)
- Approval state: Accepted for Phase 2 implementation; no search service activated yet - implementation still follows the migration boundary, risks, and testing/launch checklist below

## Context

Runtime Signals is a content-first site. Search must be useful without making article HTML depend on a server, database, or hosted vendor. The archive begins small but may later include papers, repositories, benchmarks, datasets, tools, and code-oriented material.

## Requirements

Launch requires build-time indexing, title/summary/body/topic/series/author/date fields, topic and series filters, keyboard access, mobile usability, highlighting, draft exclusion, deleted-content removal, a static fallback, and link/schema tests. Exact phrase and typo behavior should be tested rather than assumed. Query analytics are optional and must not log raw queries by default.

## Options considered

| Option | Fit now | Main tradeoff |
| --- | --- | --- |
| Pagefind | Best | Build-time only; advanced ranking/facets need measurement and metadata conventions |
| Orama | Possible later | More custom JavaScript/index design and client memory; supports full-text/vector/hybrid |
| Algolia | Deferred | Excellent hosted features; vendor cost, external dependency, and data-transfer boundary |
| Typesense / Meilisearch | Deferred | Strong search servers; adds hosting, backups, operations, and request dependency |
| Cloudflare AI Search / Vectorize | Rejected for launch | Semantic capability is premature; current AI Search is beta and pricing is subject to change |
| PostgreSQL / Convex search | Rejected for launch | Requires a database and request-time availability for a static publication |

## Decision

Use Pagefind after the Astro build. Index only published HTML. Put stable filter metadata in generated elements and maintain a small search adapter so the UI is not coupled to Pagefind internals. Load the search island and index chunks only on the search page or after explicit focus. Keep `/articles`, topic hubs, series pages, and a no-JS browse path as the fallback.

At launch, do not add semantic search, a hosted index, raw query logging, or a database. Evaluate index size and task quality at 100, 1,000, and 5,000 representative documents.

Migration boundary: reconsider when any two of these hold for two consecutive releases: compressed search payload exceeds 1–2 MB on a representative mobile connection; index memory causes failures on target Android devices; archive exceeds 5,000–10,000 searchable documents; multilingual stemming or faceting cannot be met; or measured search tasks require typo-tolerant field ranking Pagefind cannot provide.

## Evidence

- Pagefind documents post-build indexing, chunked lazy loading, filters, API access, and multilingual support: [homepage](https://pagefind.app/), [running Pagefind](https://pagefind.app/docs/running-pagefind/), [API](https://pagefind.app/docs/api/), [multilingual](https://pagefind.app/docs/multilingual/), accessed 2026-08-28.
- Cloudflare AI Search documents a free beta limit of 20,000 queries/month and 100,000 files, with future pricing subject to notice: [limits and pricing](https://developers.cloudflare.com/ai-search/platform/limits-pricing/), accessed 2026-08-28.
- Meilisearch Cloud starts at a published $20/month tier, while self-hosting transfers updates, backups, and scaling to the operator: [pricing](https://www.meilisearch.com/pricing), accessed 2026-08-28.
- Algolia publishes a free 10,000-request/50,000-record tier and paid request/record pricing: [pricing](https://www.algolia.com/pricing), accessed 2026-08-28.

The conclusion that Pagefind is sufficient is an architectural inference and must be validated by the local benchmark and real content.

## Consequences

Positive: no search outage can break reading; no search server or query data is required; index deployment is atomic with the article build; content remains portable.

Negative: updates require a build; query analytics are limited unless deliberately added; very large or multilingual archives may require a second system.

## Risks

- Draft leakage: CI indexes only generated published routes; test a fixture containing drafts.
- XSS in highlighting: render Pagefind result text through its safe API; never inject raw query/content HTML.
- DoS/memory: cap result rendering and index payload; abort search on malformed/oversized responses.
- Poisoned index: only trusted merged builds can deploy; check slug/status/URL invariants.
- Stale index: build artifact includes a content revision; deployment check compares index revision to commit SHA.

## Mitigations

The controls above are implemented as schema/build tests, safe result rendering, payload caps, protected deployments, and a generated index revision manifest. A failing check blocks deployment rather than silently producing a partial index.

## Cost

Pagefind is an open-source build tool with no service fee. At launch and 10k/100k monthly page views, expected incremental search cost is $0. Cloudflare Workers Static Assets currently has a $0 static-assets model; a paid Worker plan is $5/month if a dynamic route is later enabled. Hosted alternatives range from Meilisearch Cloud's published starting tier to usage-based Algolia pricing; both are deferred.

## Exit strategy

Export a JSON search document during every build containing URL, title, summary, body text, facets, date, author, and content revision. A future Orama, Typesense, Meilisearch, Algolia, or Cloudflare index can consume that artifact. Keep the browse pages and canonical URLs unchanged.

## Reconsideration triggers

The migration boundary above, a requirement for private/user-specific search, more than one language with materially different analyzers, a benchmark showing unacceptable recall/precision, or a need for server-side query analytics.

## Status as of Phase 2 checkpoint 2

Implemented: build-time indexing scoped to real content (`data-pagefind-body`), topic/author/series/date filter *metadata* on every article/brief (`data-pagefind-filter` in `ArticleLayout.astro`), topic/author/series filter controls in `SearchIsland.tsx`, draft/unapproved exclusion (proven black-box against real `dist/` output), keyboard-focusable results, a no-JS fallback via `/articles` and topic hubs, and a working search UI at `/search`.

Date filtering remains explicitly deferred, not silently dropped: the indexed date metadata is a full ISO timestamp, and no date-control UX is exposed until a concrete need justifies the added complexity. The topic/author/series controls are now implemented against Pagefind's `filters` option.

**Fixture scaling against this ADR's migration boundary**: measured for real at 100/1,000/5,000 documents - see `docs/poc/README.md` ("Fixture scaling: complete") for full numbers and methodology. Headline result: the fixed per-session search payload (engine + index metadata, not the whole archive) is ~382 KB gzip at 5,000 documents, comfortably under the "1-2 MB compressed" boundary this ADR set; Pagefind's own build and query-time cost scale sub-linearly. Not yet a reconsideration trigger. Re-measure again once the real archive reaches the low thousands rather than assuming these numbers hold indefinitely.

## Testing and launch checklist

- Validate published-only indexing, slug deletion, redirects, filters, phrase queries, highlighting, keyboard navigation, no-JS browse, and malformed content.
- Measure build time, index bytes, gzip/brotli bytes, and browser memory at 100/1k/5k synthetic documents.
- Run mobile device or throttled browser tests on a representative Android profile.
- Check search service failure by blocking index requests; article pages must still render.
- Record index revision, generated document count, and build result as CI artifacts.
