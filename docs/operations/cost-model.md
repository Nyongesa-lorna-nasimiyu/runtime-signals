# Operations and cost model

Snapshot date: 2026-08-28. Prices are indicative and must be rechecked before purchase. These estimates exclude domain, taxes, email volume beyond plan, and optional observability/AI inference costs.

## Recommended launch stack

| Component | Launch choice | Expected launch cost | Notes |
|---|---|---:|---|
| Public hosting | Cloudflare Workers + Static Assets | $0/mo for static assets; $5/mo if a paid Worker route is needed | Static assets are deployed with the Worker; recheck current file and asset limits before launch. |
| Build/CI | GitHub Actions | $0 initially for public repo usage, subject to plan limits | Protect production environment and secrets with required review. |
| Dynamic backend | None initially | $0/mo | Add D1 or a bounded Worker only after a concrete requirement and approval. |
| Newsletter | Buttondown | $0 initially for first 100 subscribers | Add-ons and subscriber pricing must be checked against required segmentation/analytics. |
| Domain | `.tech` via registrar | $6.99 first year sale / $50.98 regular shown by Porkbun | Availability and price are time-sensitive; no purchase authorized yet. |
| Analytics | Privacy-first self-hosted or low-volume tool | $0–$20/mo target | Avoid raw content/session replay and invasive tracking by default. |
| Error/performance monitoring | OpenTelemetry to a chosen backend | $0–$25/mo target | Keep telemetry vendor-neutral; do not add Langfuse for ordinary web spans. |

## Budget envelopes

- **Prototype**: $0–$15/month plus domain, using free tiers and local builds.
- **Early production**: $5–$75/month, adding a paid Worker route, email or analytics features, and a hosted telemetry backend if required.
- **Growing publication**: $100–$300/month, driven primarily by newsletter list size, analytics, build minutes, and optional search/AI processing—not static page delivery.

## Cost controls

- Static-cache public HTML and assets.
- Set spend alerts and invocation/CPU limits on dynamic services.
- Do not run LLMs in page requests.
- Batch source ingestion and editorial AI assistance; record provider usage, cache reads/writes, model ID, and cost separately.
- Keep provider-reported billing data as the financial authority; Langfuse inferred cost is analysis data.
- Export newsletter data monthly and keep a provider-neutral suppression ledger.

## Observability specification

Use OpenTelemetry for request traces, content builds, publication jobs, search requests, newsletter submissions, webhooks, external APIs, background tasks, build failures, cache behavior, and web-vitals events. Redact email addresses, raw article drafts, tokens, prompts, and private source material by default.

If AI assists editorial work, put model calls in a separate span namespace and correlate with the parent trace. Langfuse is optional for those AI spans; it must not replace ordinary application telemetry or provider billing records.
