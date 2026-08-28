# Observability specification

Date: 2026-08-28

## OpenTelemetry boundary

Instrument request traces, builds, publication jobs, search failures, future form/webhook routes, external API calls, background source jobs, cache behavior, and bounded web-vitals measurements with vendor-neutral OpenTelemetry. Use a Collector only when batching, filtering, retries, or multi-backend export justify the extra hop. Redact email, raw prompts, source text, query strings, tokens, and draft bodies.

Recommended attributes: `service.name`, `deployment.environment`, `content.revision`, `route.template`, `publication.state`, `external.service`, `outcome`, and bounded error codes. Do not use arbitrary URL/query values as high-cardinality attributes.

## AI telemetry boundary

Editorial model calls may emit a separate AI trace namespace to Langfuse through OTLP, correlated by trace ID. Store model/provider, prompt version, input source IDs, output, timestamp, provider-reported token/cache usage, cost, and reviewer decision. Do not store hidden reasoning. Langfuse-derived cost is analysis only; provider invoices and usage reports are authoritative.

## Alerts

- Production deployment failed or expected scheduled build absent.
- Publication gate bypass attempt or draft in production artifact.
- Static asset 5xx or elevated latency.
- Search index missing, stale, or oversized.
- Signup error rate or webhook signature failures spike.
- Provider quota or suppression reconciliation mismatch.
- Unexpected analytics payload fields or PII test failure.

Telemetry failure must be fail-open for reading and fail-closed for publication approval and webhook side effects.
