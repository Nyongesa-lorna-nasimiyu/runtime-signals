# Runtime Signals detail-page related content

> **Status: Proposed - not implemented.** This note records a v1 recommendation; it does not
> authorize or include code changes.

## Repository facts

- The shared editorial schema in `src/content.config.ts` has `related`, but it is an
  article-only `reference('articles')` array. There is currently no runtime call site for it;
  `docs/architecture/content-model.md` records the same limitation.
- Series metadata has an authoritative article sequence in `src/content.config.ts` as
  `series.order`. `src/pages/series/[slug].astro` resolves that sequence and deliberately
  preserves its authorial reading order.
- Both detail routes (`src/pages/articles/[...slug].astro` and
  `src/pages/brief/[...slug].astro`) use `ArticleLayout.astro`. The rendered detail page currently
  ends with conditional claims, revision history, artifacts, and sources sections.
- The existing publication boundary distinguishes live content from merely routable archived
  content. v1 should reuse the build-time live/approval decision (`canPublish` with `BUILD_TIME`),
  so recommendations cannot expose drafts, not-yet-due scheduled content, or unapproved content.

## v1 recommendation

Append optional related-content sections after the existing sources section. Build the lists from
content collections at build time, and apply this order:

1. **Related reading:** resolve `entry.data.related` and retain its explicit authorial order.
2. **Continue the series:** when the entry belongs to a series, use that series' `order` as the
   authoritative sequence and show subsequent eligible article(s) in a separate section. Do not
   mix this continuation into scored topic recommendations.
3. **More on these topics:** fill with up to three remaining live articles that share at least one
   topic. Sort fallbacks by shared-topic count descending, `published_at` descending, then stable
   `id` ascending.

Across the combined output, exclude the current entry, duplicates, drafts, future scheduled
entries, unapproved entries, and archived entries. Apply the same eligibility rule to explicit
related and series candidates; an authored reference is not a publication override. If a section
has no candidates after filtering, omit the section and its heading rather than rendering an empty
shell.

For briefs, recommend live articles by shared topic only. The current `related` contract cannot
represent brief-to-brief recommendations because it references `articles` exclusively.

## Rendering and crawlability

Use a semantic `<section>` with an `<h2>` for each non-empty group, such as “Continue the series”
and “Related reading”. Render each item through the existing `ArticleCard` with its default
heading level 3, and provide its normal article or brief path as a plain server-rendered `<a
href="...">` link. Do not add client-side fetching, ranking, or JavaScript navigation. This keeps
descriptive internal links present in the HTML, consistent with [Google's crawlable,
descriptive-link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).

The build-time approach fits the current Astro static route model: content collections expose
typed references and `getEntries()`, while `getStaticPaths()` supplies collection entries to
prerendered pages. See [Astro content collections and static route
generation](https://docs.astro.build/en/guides/content-collections/).

## Acceptance checks for implementation

- Explicit related items retain declared order; series continuation remains a distinct,
  `series.order`-ordered group.
- Fallback ranking is deterministic and capped at three, with self/duplicate and every listed
  non-live state excluded.
- Brief pages recommend articles by topic and never assume `related` can point to briefs.
- Empty groups emit no section or heading; emitted groups have an `<h2>`, cards retain `<h3>`,
  and links are present without JavaScript.
