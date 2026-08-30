---
title: 'Weekly Brief: Trace visibility is not auditability'
dek: Distinguish debugging telemetry from an evidence trail that can support a consequential review.
status: draft
authors: [jordan-avery]
topics: [observability, security]
published_at: 2026-09-18T07:00:00Z
reading_time_minutes: 3
claims:
  - id: claim.brief.auditability-boundary
    text: A trace is not automatically a complete, attributable, tamper-evident, and exportable audit record.
    evidence: inference
    sources: [opentelemetry-traces, nist-ai-rmf]
citations: [opentelemetry-traces, nist-ai-rmf]
---

Draft brief for an auditability cluster. Inventory which events are sampled, who can alter them,
how long payload references live, and whether a reviewer can export the evidence without vendor
console access. OpenTelemetry gives useful tracing primitives; [NIST's AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
helps frame the recurring governance work.

Action: write a one-page evidence contract for a high-impact tool call, including retention,
redaction, actor identity, policy version, and the committed result.
