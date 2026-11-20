# SEO and AI-search strategy

Snapshot date: 2026-08-28.

## Principle

Search discoverability is a consequence of original engineering value, clear information architecture, accurate metadata, stable URLs, and evidence that other engineers want to reference. No keyword stuffing, content spinning, or speculative “AI optimization” files.

Google's current guidance says the same Search fundamentals apply to AI Overviews and AI Mode, with no additional technical requirements or special AI text files. [Google AI features](https://developers.google.com/search/docs/appearance/ai-features). Treat `llms.txt` as optional documentation for human/agent readers, not a ranking dependency.

## Technical implementation

- Server-render complete article HTML; do not hide article body behind React hydration.
- One canonical HTTPS URL per page, emitted in HTML and feeds.
- Paginate `/articles` and `/brief` with 10 live entries per page: page 1 stays at the root, while page 2+ use static `/page/{n}` routes only when needed. Use regular crawlable anchors and unique per-page title, description, and canonical metadata. Publication filtering excludes drafts, future entries, unapproved entries, and archived entries from active listings.
- Generate XML sitemap index when URL count warrants it; exclude drafts, noindex pages, redirects, and archived pages that are intentionally gone.
- Serve `/robots.txt` with sitemap location; use `noindex` or authentication for hiding pages, not robots.txt alone. [Google robots guidance](https://developers.google.com/search/docs/crawling-indexing/robots/intro).
- Generate RSS and Atom feeds for all articles and the weekly brief. Google documents RSS/Atom as accepted sitemap-like discovery inputs but XML remains the canonical sitemap. [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- Emit JSON-LD only when it matches visible content: `Article`/`BlogPosting`, `BreadcrumbList`, `Organization`, `Person`/`ProfilePage`, and `WebSite` where valid. Validate with Schema Markup Validator and Google Rich Results Test. [Google Article](https://developers.google.com/search/docs/appearance/structured-data/article).
- Add Open Graph and `twitter:card` metadata, stable image dimensions, alt text, and responsive image variants.
- Use descriptive URL slugs and link topic pillars, series, sources, and related articles from the body.
- Provide 404 for unknown URLs and 410 for intentionally removed content; maintain an explicit redirect map for changed slugs.
- Use meaningful `datePublished`, `dateModified`, author identity, revision note, and correction note.

## Editorial SEO

### High-intent implementation opportunities

- OpenTelemetry GenAI semantic conventions in practice.
- Instrument an agent with OpenTelemetry and inspect it in Langfuse.
- Langfuse versus provider token/cost reconciliation.
- Agent evaluation beyond transcript judging.
- Idempotency and leases for agent tool execution.
- Prompt injection and tool authorization boundaries.
- Coding-agent harness reliability and artifact-aware evaluation.
- Model routing and handoff state transfer.
- Failure attribution in multi-agent traces.

### Broad informational opportunities

- What is AgentOps?
- What is agent observability?
- How do AI agents fail in production?
- What is a reliable AI agent?
- How do model handoffs work?
- What is OpenTelemetry GenAI?

Use broad terms for pillar pages and internal links; use implementation queries for focused articles with code and tested steps. Revalidate search intent quarterly rather than chasing every new vendor term.

## AI-mediated search discoverability

Make each article easy to quote accurately:

- Start with a concise thesis and definition.
- Use explicit “Claim”, “Evidence”, “Failure mechanism”, “Practice”, and “Limits” sections where appropriate.
- Link primary sources directly and label inference.
- Include stable tables, checklists, diagrams with text alternatives, and source IDs.
- Put author expertise and update history on the page.
- Expose Article JSON-LD, canonical URLs, feeds, and structured source pages.
- Publish first-party experiments and code that distinguish analysis from vendor copy.

Do not use hidden text, prompt bait, automated article generation, or `llms.txt` as a presumed ranking lever.

## Performance and accessibility budgets

- Core Web Vitals at p75: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1.
- Article HTML readable before JavaScript; article route JS target <= 40 KB compressed excluding optional explainer chunks.
- No layout shift from fonts, images, embeds, or code blocks; dimensions must be declared.
- Lighthouse mobile performance target >= 90 for article pages and accessibility >= 95, with exceptions documented.
- WCAG 2.2 AA for full pages, keyboard paths, focus, reduced motion, forms, code blocks, footnotes, and diagram alternatives.

## Measurement and refresh

Track Search Console and Bing Webmaster data by page, topic, and intent. Refresh on a schedule based on evidence: outdated provider APIs, changed framework semantics, decaying impressions/CTR, new primary evidence, or broken examples. Preserve revisions rather than silently rewriting history.
