# Runtime Signals architecture overview

Date: 2026-08-28  
Status: Phase 1 recommendation; approval pending

## Recommended launch architecture

```text
GitHub repository (content, schemas, code, reviews)
        |
        +--> GitHub Actions: validate -> build -> Pagefind index -> deploy
        |                                      |
        |                                      v
        |                         Cloudflare Workers + Static Assets
        |                                      |
        |                              crawlable Astro HTML
        |
        +--> scheduled source discovery -> GitHub issues/project

Reader --> Astro HTML --> optional Pagefind island
       --> Buttondown form (future, provider-authoritative)
       --> Cloudflare Web Analytics (future, non-blocking)
       --> Search Console / Bing Webmaster (operator consoles)

Editorial AI (future, opt-in) --> OTel/Langfuse AI trace only
Web/runtime telemetry ---------> vendor-neutral OpenTelemetry backend
```

## Locked-by-default boundaries

- Public reading is static and must continue working if every third-party service fails.
- Pagefind is a build artifact, never a request-time dependency.
- The newsletter provider owns subscriber state at launch. The website does not persist email addresses.
- Cloudflare Web Analytics, Search Console, and Bing Webmaster measure different things; they are not one analytics database.
- GitHub pull-request review and protected deployment environments are the publication approval boundary.
- External source material and generated text are untrusted input. Only trusted repository authors may use executable MDX.
- No Convex, Express, database, hosted search, semantic search, or production AI editorial integration is required at launch.

## Performance budgets

Targets are engineering budgets, not service guarantees:

| Surface | Budget |
| --- | --- |
| Article HTML | server-rendered; no required client JavaScript |
| Core Web Vitals | p75 LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 |
| Article JavaScript | 0 KB required; optional islands must be individually budgeted |
| Search | lazy-load index and UI only after explicit interaction; target <= 1 MB compressed initial search payload |
| Fonts | system stack first; no layout shift; self-host only if a measurable benefit exists |
| Images | intrinsic dimensions, responsive sources, compressed formats, descriptive alt text |
| Availability | static reading independent of search, newsletter, analytics, and AI services |

The Core Web Vitals targets follow Google's current guidance; WCAG 2.2 AA remains the accessibility target. See the research report for evidence links.

## Deferred architecture

When a concrete dynamic requirement appears, add one bounded service at a time:

1. A Worker route for a newsletter form or verified webhook, with strict rate limits and no content-rendering dependency.
2. D1 only if a local subscriber projection, audit ledger, or reconciliation queue is required.
3. Orama/WASM or a hosted search service only when measured static-search limits are exceeded.
4. A queue/worker pipeline for source ingestion only when scheduled GitHub Actions become operationally insufficient.
5. Semantic/hybrid search only after a representative evaluation set demonstrates better task success than lexical search.

## Expensive-to-reverse decisions

- Public URL and canonical URL policy.
- Subscriber consent and data ownership model.
- Storing personal data locally.
- Executable MDX as a content capability.
- Switching from Git review to a database/CMS as source of truth.

## Safe-to-revisit decisions

- Pagefind UI styling and field weighting.
- Analytics vendor after a documented metric need.
- Newsletter provider behind the provider adapter.
- Cloudflare Cron versus GitHub schedule for non-publication jobs.
- Whether a small number of interactive explainers justify React islands.
