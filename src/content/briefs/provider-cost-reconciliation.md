---
title: 'Weekly Brief: Provider billing and local token telemetry disagree'
dek: A reconciliation worksheet for usage buckets, rounding, retries, and cached work.
status: draft
authors: [jordan-avery]
topics: [observability, evaluation]
published_at: 2026-10-09T07:00:00Z
reading_time_minutes: 3
claims:
  - id: claim.brief.cost-reconciliation
    text: Cost decisions require reconciling application-side usage records with provider-reported billing semantics.
    evidence: inference
    sources: [opentelemetry-genai-semconv]
citations: [opentelemetry-genai-semconv]
---

Draft brief for the observability cluster. Keep input, output, cached, retry, and failed-attempt
usage in separate buckets. Compare the application record with the provider's invoice or usage
export over the same time window; do not assume a span attribute is a bill. The [GenAI semantic
conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) help name telemetry fields, not
provider-specific billing rules.

Action: reconcile one day of traffic and write down every unexplained difference before changing a
model or routing policy.
