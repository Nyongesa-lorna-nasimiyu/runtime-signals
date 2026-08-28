# Phase 1 decision pack

Date: 2026-08-28

Status: recommendation for approval. The domain is user-confirmed secured; this document is not an authorization to publish or deploy.

## Executive recommendation

Build a high-signal publication named **Runtime Signals**, with the working domain `runtimesignals.tech`, using:

- Astro static generation for the public publication.
- React 19 islands for search, theme switching, copy buttons, reading progress, and selected explainers.
- Git-backed Markdown with typed frontmatter and structured source records as the publication source of truth.
- No Convex or Express service in the initial architecture. GitHub Actions, static build-time processing, and narrowly scoped Cloudflare Worker routes only when required cover the initial needs.
- Cloudflare Workers with Static Assets for public delivery, with GitHub Actions for validation and deploys.
- Buttondown for the initial newsletter, subject to verification of consent, domain authentication, export, and webhook behavior before production sending.

This direction optimizes for crawlable HTML, low JavaScript, reviewable technical claims, cheap operation, and a clean escape hatch if the editorial system later becomes a larger product.

## Product thesis and non-negotiables

Runtime Signals is not an AI news site. It publishes system-level analysis of evaluation, reliability, recovery, orchestration, state, memory, tool security, distributed execution, observability, OpenTelemetry, Langfuse, coding agents, model routing, and failure analysis.

The editorial invariant is:

> Every article identifies a real systems problem, names the underlying invariant, supports claims with primary evidence, and leaves the reader with an implementable engineering practice.

Quality gates:

1. No unreviewed AI-generated articles are published.
2. Every consequential factual claim has a source record or is explicitly marked as inference/opinion.
3. Source records preserve URL, publisher, publication date, access date, evidence type, and what the source supports.
4. Articles state limitations and workload/configuration boundaries.
5. A human approves publication, meaningful updates, corrections, and syndicated versions.

## Evidence and inference

### Evidence collected

- Google says its AI Search features use the existing technical and people-first SEO fundamentals, require crawlable/indexable pages, and do not require special AI files or markup. [Google AI features](https://developers.google.com/search/docs/appearance/ai-features), accessed 2026-08-28.
- Google recommends JSON-LD for structured data and says markup must match visible content; structured data enables eligibility rather than guaranteeing a rich result. [Structured data introduction](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data), accessed 2026-08-28.
- Google documents Article, BreadcrumbList, and ProfilePage structured data for article and author pages. [Article](https://developers.google.com/search/docs/appearance/structured-data/article), [Breadcrumb](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb), [ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page).
- Current Core Web Vitals targets at the 75th percentile are LCP <= 2.5 seconds, INP <= 200 ms, and CLS <= 0.1. [web.dev thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds), accessed 2026-08-28.
- WCAG 2.2 is the current W3C Recommendation and defines Level AA conformance across the full page, including responsive variants. [WCAG 2.2](https://www.w3.org/TR/WCAG22/), accessed 2026-08-28.
- Astro content collections provide build-time loaders, schemas, type safety, and Markdown/MDX support; Astro specifically recommends build-time collections for static content where performance and caching matter. [Astro content collections](https://docs.astro.build/en/guides/content-collections/), accessed 2026-08-28.
- MDX is a programming language and its documentation warns not to let untrusted authors write MDX. [MDX security](https://mdxjs.com/docs/getting-started/#security), accessed 2026-08-28.
- TanStack Start supports SSR and static prerendering, but its current Server Components and deferred-hydration documentation labels those features experimental. [SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr), [prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering), [Server Components](https://tanstack.com/start/latest/docs/framework/react/guide/server-components).
- Convex provides TypeScript queries/mutations, ACID transactional mutations, actions for network calls, HTTP access, scheduling, and cron jobs, but no launch requirement needs those capabilities. [Convex overview](https://docs.convex.dev/understanding/overview), accessed 2026-08-28.
- Cloudflare recommends Workers for new projects and documents Workers Static Assets, current pricing, and asset limits. [Workers guidance](https://developers.cloudflare.com/pages/get-started/), [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [pricing](https://developers.cloudflare.com/workers/platform/pricing/), accessed 2026-08-28.
- Cloudflare Workers Paid is $5/month with included usage; static assets are free and unlimited under the documented model. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), accessed 2026-08-28.
- Buttondown exposes subscriber, export, and webhook APIs; its pricing page currently shows no charge for the first 100 subscribers and add-ons for segmentation, analytics, automations, and other features. [Buttondown pricing](https://buttondown.com/pricing), [API](https://docs.buttondown.com/api-introduction), [exports](https://docs.buttondown.com/api-exports-introduction), [webhooks](https://docs.buttondown.com/api-webhooks-introduction), accessed 2026-08-28.
- Resend offers a developer-oriented alternative with free transactional sending up to 3,000 emails/month and a $20/month Pro tier for 50,000 emails; its documentation covers suppression, delivery events, and one-click unsubscribe, but it leaves more list/editorial behavior to the application. [Resend pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing), [events](https://resend.com/docs/webhooks/event-types), [suppression](https://resend.com/docs/dashboard/emails/email-suppressions), accessed 2026-08-28.
- OpenTelemetry has moved GenAI semantic conventions into a dedicated repository and defines attributes such as provider, operation, agent, retrieval, and system instructions. [Semantic conventions](https://opentelemetry.io/docs/specs/semconv/), [GenAI attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/), accessed 2026-08-28.
- Langfuse can ingest or infer usage and cost, but inferred cost depends on model definitions and reasoning-token visibility; provider-reported usage and cost should remain authoritative. [Langfuse cost tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking), accessed 2026-08-28.
- OWASP's current GenAI LLM Top 10 release is 2026 and includes prompt injection, insecure output handling, excessive agency, supply chain, and sensitive information disclosure. [OWASP GenAI Security](https://owasp.org/www-project-top-10-for-large-language-model-applications/), accessed 2026-08-28.

### Inferences

- A static-first publication is the lowest-risk way to meet SEO, mobile performance, and lower-powered Android requirements while keeping product complexity available for editorial tooling.
- Git-backed Markdown is more defensible than a generic CMS for a research publication because revisions, source changes, and corrections can be reviewed as code and reproduced from commits.
- Plain Markdown with typed, allow-listed interactive components is safer than arbitrary MDX for a publication that may eventually ingest outside material.
- Runtime Signals is the best working name because it signals operating evidence rather than AI hype, supports all proposed topic clusters, and has a stronger distinctiveness profile than generic alternatives.
- A managed newsletter is preferable at launch because deliverability and suppression handling are specialized; a custom subscriber database should remain a consent/event mirror, not the delivery authority.

## Decisions resolved 2026-08-28

3. Architecture: **accepted** — Astro + React islands + Git-backed Markdown + Workers Static Assets, with no Convex or Express in the first release (`docs/decisions/003-backend-boundary.md` revised to remove a stale Convex recommendation).
5. Hosting: **accepted** — Cloudflare Workers + Static Assets for the public site and GitHub Actions for the build/deploy path.
6. Search (ADR-0001), analytics (ADR-0003), and editorial automation (ADR-0004): **accepted** for Phase 2 implementation.
7. Newsletter (ADR-0002): **accepted as architecture** — provider-authoritative, no local subscriber database, no webhook endpoint at launch. Buttondown remains **conditional** pending its own account-level verification.

## Decisions still requiring approval

1. Brand: approve Runtime Signals as the working masthead, or choose another candidate in the brand report.
2. Domain: `runtimesignals.tech` is user-confirmed secured; verify registrar access, DNS control, renewal, and privacy settings before launch.
4. Newsletter provider: confirm Buttondown after its account-level checks pass (pricing/quotas/DPA at signup, DNS authentication, consent/suppression behavior), or select the fallback candidate if it fails those checks. No production email will be sent until DNS and consent checks pass regardless of provider.

## Current underserved niche

The opportunity is not “more agent news.” It is a durable systems publication that connects four layers that are usually separated:

1. Research claims and benchmark limitations.
2. Runtime invariants such as idempotency, leases, fencing, authorization, and state transfer.
3. Operational evidence such as traces, costs, failures, and recovery behavior.
4. Reproducible implementation artifacts readers can run or inspect.

The distinctive editorial unit is the **failure mechanism → invariant → engineering practice** chain. This is narrower and more defensible than broad AI commentary, and it naturally produces evergreen search pages, source-rich newsletters, and consulting credibility.

## Initial information architecture

Primary navigation:

- **Articles**: all published work, filterable by type and topic.
- **Topics**: Evaluation, Reliability, Recovery, Orchestration, State & Memory, Tool Security, Observability, OpenTelemetry, Coding Agents, Model Routing.
- **Collections**: pillar pages such as Agent Reliability Patterns.
- **Brief**: the weekly Friday briefing.
- **Sources**: research papers, reports, repositories, benchmarks, datasets, tools, and case studies.
- **About**: mission, authors, methodology, editorial policy, corrections, and contact.

URL policy:

- `/articles/{slug}` for durable articles.
- `/brief/{slug}` for weekly briefs.
- `/topics/{slug}` and `/series/{slug}` for hubs.
- `/authors/{slug}` for author identity pages.
- `/sources/{slug}` for structured source records when useful to readers.
- `/about`, `/methodology`, `/editorial-policy`, `/corrections`, `/newsletter` for trust and conversion pages.

## 30-day launch shape

Launch with five pillar pages, ten seed articles, and a visible methodology page before daily cadence begins. Publish 3–4 strong pieces per week during the first month while the research and review loop is calibrated; switch to daily only when the backlog contains at least 15 reviewed seeds and two weeks of drafted material.

The requested daily baseline is retained for steady state:

- Monday–Thursday: focused 500–900 word engineering posts.
- Friday: Agent Engineering Brief.
- Monthly: a synthesis/report or substantial experiment.
- Periodically: an implementation guide or case study.

## Risks and mitigations

- **Name collision**: initial web/RDAP checks are not legal clearance; perform trademark and social checks before registration.
- **Framework churn**: pin versions, use stable Astro primitives, and isolate interactive islands.
- **Editorial throughput**: require a reviewed backlog and reusable research cards before daily publishing.
- **Content quality**: enforce source records, claim labels, correction history, and human approval.
- **Privacy**: default to privacy-preserving analytics; avoid raw prompt/content telemetry in public-site instrumentation.
- **Newsletter lock-in**: export subscriber data regularly and maintain a provider-neutral subscriber event model.
- **Preview leakage**: preview URLs must be unguessable, expiring, noindex, and never contain production secrets.
