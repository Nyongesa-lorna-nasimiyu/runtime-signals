# Editorial automation policy

Date: 2026-08-28

## Fully automatable

- Fetch public feeds/APIs with courtesy limits.
- Extract metadata into draft source cards.
- Deduplicate by stable identifiers and flag similarity.
- Validate frontmatter, schemas, links, citations, images, feeds, sitemaps, JSON-LD, accessibility, and performance.
- Build noindex previews and deployment artifacts.
- Generate stale-source and content-decay reports.
- Prepare newsletter/social distribution drafts without sending.

## Human approval required

- Choosing claims and interpreting evidence.
- Accepting an outline or substantive AI revision.
- Publishing, updating, archiving, or changing canonical URLs.
- Claims about people, companies, security, pricing, or production behavior.
- Sending a newsletter or exporting subscribers.

## Never automate without explicit authorization

Domain/DNS changes, account creation, paid-service activation, production secret rotation, bulk email, public deletion, irreversible migration, and automatic publication of generated articles.

## AI-assisted work record

For each call, store model, provider, prompt/template version, input source IDs, output, timestamp, provider token/cache usage, cost, human reviewer, and accepted/rejected status. Do not store hidden reasoning. Source text remains untrusted data and cannot grant tool authority. Do not send restricted or personal data to a model without a documented authorization.

If Langfuse is used, correlate AI spans with OpenTelemetry trace IDs but keep AI execution telemetry separate from web/runtime telemetry and use provider records for billing truth.
