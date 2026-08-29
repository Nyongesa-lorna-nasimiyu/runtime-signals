# ADR-0003: Minimal privacy-preserving measurement

- Status: Accepted (amended 2026-08-29 - see Amendment below)
- Date: 2026-08-28 (accepted 2026-08-28)
- Approval state: Accepted for Phase 2 implementation; no analytics account or script activated yet - instrumentation still follows the privacy/retention and testing/launch checklist below

## Amendment (2026-08-29): the event contract is now built, not deferred

The original decision below says "Do not add custom behavioral analytics at launch" and treats the bounded event contract (`article_view`, `engaged_read`, `search_submit`, `artifact_open`, `newsletter_cta`, `business_cta`) as conditional future work, gated on "a specific interaction decision" emerging.

That decision has now emerged: Phase 3 Checkpoint 2 (privacy-safe measurement and observability) explicitly scopes "non-blocking Core Web Vitals and interaction measurement" as a checkpoint deliverable, and the site now has enough real content and surfaces (articles, search, an artifacts collection) to instrument meaningfully rather than speculatively.

What changes: `src/lib/analytics.ts` implements the bounded event contract exactly as originally specified here - same event names, same allow-listed-property constraint, same `engaged_read` sampling/no-identity rule, same prohibition on merging with OpenTelemetry or Langfuse. What does not change: no analytics account or script is activated by this amendment. The dispatch function's actual "send" step is an inert stub until a real provider (Cloudflare Web Analytics, or Plausible/Umami per the original decision's Phase-2 candidates) is account-verified and wired in - the exact same dry-run posture this project has used for every other external-service boundary (Cloudflare deployment, Buttondown). Building the instrumented client now and having it do nothing in production until an account exists is strictly additive to the original decision, not a reversal of its privacy posture.

Two of the six events currently have no real UI to attach to: `newsletter_cta` (the newsletter page has no signup form - see `docs/decisions/004-newsletter.md` and `src/pages/newsletter.astro`) and `business_cta` (no consulting/business CTA exists on the site yet). Both are defined in the type contract with no call site, rather than fabricated against UI that doesn't exist. `artifact_open` required fixing a real, unrelated gap first: the `artifacts` content collection existed with real data but was never rendered as a link on the article page at all.

Everything else in this ADR - the requirements, the minimum launch metrics, the privacy/retention rules, the risks, and the explicit separation from OpenTelemetry/Langfuse - stands unchanged.

## Context

Runtime Signals needs enough measurement to improve reach, reader trust, retention, subscription, and technical authority. It does not need surveillance, session replay, fingerprinting, or a large event warehouse. Infrastructure telemetry, search-engine performance, audience analytics, newsletter analytics, and business conversions have different owners and meanings.

## Requirements

Cookie-free where practical; no fingerprinting; no raw email, prompt, source, or sensitive query data; analytics failure never blocks rendering; minimal JavaScript; documented retention/deletion; useful metrics with an explicit decision attached.

## Options considered

| Option | Fit now | Main tradeoff |
| --- | --- | --- |
| Cloudflare Web Analytics + Search Console + Bing | Recommended launch baseline | Strong for RUM and search performance; limited custom product events |
| Plausible | Phase-2 candidate | Privacy-preserving custom events and funnels; paid and current plan price requires checkout verification |
| Umami | Phase-2 candidate | Open-source, small script, self-host/data ownership; self-host adds PostgreSQL operations |
| PostHog | Deferred | Powerful product analytics/replay/warehouse; overcollection and complexity for a publication |
| Matomo | Deferred | Broad control and self-host option; larger operational/feature surface |
| First-party event pipeline | Deferred | Maximum control but creates PII, retention, anti-abuse, and reporting obligations |
| Google Analytics | Rejected by default | More invasive and not needed for launch decisions |

## Decision

Launch with Cloudflare Web Analytics for aggregate performance/audience signals, Google Search Console for Google search performance, and Bing Webmaster Tools for Bing/indexing signals. Do not add custom behavioral analytics at launch. Treat article “completion” as an editorial hypothesis, not a reliable metric, until a small instrumented experiment demonstrates that it changes a decision.

If a specific interaction decision emerges, add Plausible behind a small adapter, using event names and bounded properties. Umami is the self-hosted alternative if data residency or cost justifies PostgreSQL operations. Do not merge any of these with OpenTelemetry or Langfuse.

## Minimum launch metrics

1. Indexed URLs
2. Organic impressions
3. Organic click-through rate
4. Qualified article readers (initially search-console/pageview proxies, not claimed completion)
5. Returning readers
6. Confirmed newsletter subscriptions
7. Internal-navigation depth
8. Artifact/GitHub CTA selections
9. Earned referring domains/backlinks
10. Qualified consulting/product inquiries

Search Console/Bing provide reach and search signals; Cloudflare Web Analytics provides aggregate web-performance/audience signals; the newsletter provider owns delivery metrics; GitHub/CRM records business conversion. RSS subscriber count is a directional self-reported or feed-host metric, not a precise launch metric.

## Evidence

- Cloudflare Web Analytics describes a free, privacy-first product and browser performance collection without personal data claims: [about](https://developers.cloudflare.com/web-analytics/about/), [collection](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/), accessed 2026-08-28.
- Google Search Console documents performance, indexing, Core Web Vitals, structured data, and sitemap workflows: [getting started](https://developers.google.com/search/docs/monitor-debug/search-console-start?hl=en), accessed 2026-08-28.
- Bing documents sitemap submission and IndexNow: [sitemaps](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed), [IndexNow](https://www.bing.com/webmasters/help/indexnow-0z209wby), accessed 2026-08-28.
- Plausible documents cookie-free custom events, event properties, and pageview/event-based billing: [custom events](https://plausible.io/docs/custom-event-goals), [properties](https://plausible.io/docs/custom-props/for-custom-events), [plans](https://plausible.io/docs/subscription-plans), accessed 2026-08-28.
- Umami documents a no-cookie/no-fingerprint model, custom events, and self-hosting: [docs](https://docs.umami.is/docs), [FAQ](https://docs.umami.is/docs/faq), accessed 2026-08-28.

## Privacy and retention

At launch, retain no raw analytics event log owned by Runtime Signals. Use provider dashboards with documented account access. Strip query strings from URLs before any future event is emitted. Never send email addresses, IP addresses, full user agents, article draft text, prompt content, or free-form search queries. A future event contract uses bounded enums: `article_view`, `engaged_read`, `search_submit`, `artifact_open`, `newsletter_cta`, and `business_cta`; properties are allow-listed slugs/topics, not arbitrary strings. Keep detailed event data for 90 days only if a decision needs it; retain aggregate monthly reports for two years.

Article completion is not trustworthy as a precise percentage: tabs can be backgrounded, readers can use feeds or print, and IntersectionObserver measures viewport behavior rather than comprehension. If tested, call it `engaged_read` and emit only once after a time-plus-depth threshold, sampled and without an identity.

## Consequences

Positive: very small privacy/performance footprint, no database or consent-banner dependency for basic aggregate measurement, clear separation of concerns.

Negative: less granular product insight and less ability to connect reader journeys; some metrics arrive with delay; provider dashboards are external dependencies.

## Risks

- Aggregate tools may not answer a later product question.
- “Completion” may be misinterpreted as comprehension or retention.
- A provider dashboard may become a hidden operational dependency.
- A future custom event can accidentally introduce PII or high-cardinality data.

## Mitigations

Keep metric definitions vendor-neutral, require a decision for every event, call depth/time signals `engaged_read`, run payload/privacy tests, export aggregate reports, and keep rendering independent of all analytics requests.

## Cost

Cloudflare Web Analytics, Search Console, and Bing Webmaster are currently documented as free tools. Initial incremental cost is $0. Plausible is paid with a 30-day trial; the official current docs describe tiering by pageviews plus custom events but require checkout/account selection for the exact price. Umami software is open source, but self-hosting introduces compute and PostgreSQL backup cost. No behavioral analytics cost is incurred until justified.

## Exit strategy

Keep metrics defined independently of vendor names. Export monthly aggregate CSV/PDF reports and, if a future event tool is used, retain an allow-listed event contract and vendor-neutral event fixtures. Switch to Plausible, Umami, Matomo, or a first-party pipeline without changing page URLs or editorial metrics names.

## Reconsideration triggers

Need for funnel analysis, attribution to multiple CTAs, editorial decisions that cannot be answered by baseline tools, data-residency requirements, provider availability issues, or a verified need to measure engaged reads. Reconsider only with a privacy review and performance budget.

- Confirm analytics script failure does not block HTML or hydration.
- Measure script bytes and main-thread impact on a low-powered Android profile.
- Verify no cookies/fingerprinting and no query-string or PII leakage.
- Verify bot/internal traffic handling and property cardinality if custom events are later added.
- Validate Search Console/Bing ownership, sitemap submission, canonical URLs, and structured data.

## Testing and launch checklist

- Confirm analytics script failure does not block HTML or hydration.
- Measure script bytes and main-thread impact on a low-powered Android profile.
- Verify no cookies/fingerprinting and no query-string or PII leakage.
- Verify bot/internal traffic handling and property cardinality if custom events are later added.
- Validate Search Console/Bing ownership, sitemap submission, canonical URLs, and structured data.
