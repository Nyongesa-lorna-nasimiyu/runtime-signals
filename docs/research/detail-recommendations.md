# Runtime Signals detail-page related content

> **Status: Implemented.** This note describes the current build-time implementation and
> separates future improvements from shipped behavior.

## Current implementation

`getRelatedContent` in `src/lib/related.ts` runs at build time from both detail routes and
passes its result to `ArticleLayout.astro`. The shared `related` field in
`src/content.config.ts` is capped at three article references.

The related-reading selection works as follows:

1. **Curated references first:** resolve the entry's article references in their declared order.
   Candidates are filtered through the build-time publication and approval gate
   (`getPublishedEntries(..., BUILD_TIME)` / `canPublish`), so only live, approved articles are
   eligible. Missing references, self-links, and duplicates are skipped without changing the
   order of the remaining references.
2. **Same-topic fallback:** consider other live, approved articles that share at least one topic,
   excluding the current entry, curated entries, and the series continuation. Rank them by shared
   topic count descending, publication date descending, then stable article ID ascending. Fill only
   the remaining related-reading slots, for a maximum of three entries in total.

For an article only, the implementation also selects one next eligible article from the first
matching series' declared `series.order`, preserving the author's sequence. This is a separate
“Continue the series” item and does not consume the three related-reading slots. Non-live
candidates—including drafts, not-yet-due scheduled entries, unapproved entries, and archived
entries—are excluded from every selection. Briefs can link to articles through this same
article-only recommendation path; they do not produce brief-to-brief recommendations.

## Rendering and crawlability

The related-content component is rendered after the existing Sources section in
`src/layouts/ArticleLayout.astro`. It omits empty groups, uses an `<h2>` for each emitted section,
and renders each item through the existing `ArticleCard` with heading level 3. Cards contain normal
server-rendered article links, with no JavaScript for fetching, ranking, or navigation.

The build-time approach fits the current Astro static route model: content collections expose
typed references and `getEntries()`, while `getStaticPaths()` supplies collection entries to
prerendered pages. See [Astro content collections and static route
generation](https://docs.astro.build/en/guides/content-collections/).

The plain descriptive links in the generated HTML also follow [Google's crawlable,
descriptive-link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).

## Future improvements

The following are not part of the current implementation:

- Extend the curated-reference contract if the product needs brief-to-brief or other
  cross-content recommendations; `related` currently accepts article references only.
- Revisit the three-item cap and fallback ranking after editorial review or observed usage provides
  evidence for different limits or signals.
- Add dedicated regression and rendered-HTML coverage for ordering, publication filtering,
  duplicate handling, and the no-JavaScript output.
