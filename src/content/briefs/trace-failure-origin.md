---
title: 'Weekly Brief: Your trace shows the failure, not its origin'
dek: A small instrumentation exercise for joining model, tool, state, and scheduler events.
status: scheduled
authors: [jordan-avery]
topics: [observability, orchestration]
published_at: 2026-09-11T07:00:00Z
reading_time_minutes: 3
claims:
  - id: claim.brief.trace-context
    text: Distributed traces depend on propagated context to connect work across components.
    evidence: supported
    sources: [opentelemetry-traces, w3c-trace-context]
citations: [opentelemetry-traces, w3c-trace-context]
---

Draft brief for an observability cluster. Take one failed run and ask whether the trace contains a
stable run ID, operation ID, state version, worker identity, and parent/link relationship for every
tool call. OpenTelemetry documents the trace/span model, while [W3C Trace Context](https://www.w3.org/TR/trace-context/)
defines interoperable propagation.

Action: kill a worker after a tool request, let a replacement resume, and verify that the trace
shows both attempts as one logical run with an explicit reconciliation result.
