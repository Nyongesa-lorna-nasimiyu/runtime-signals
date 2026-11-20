---
title: 'Weekly Brief: Weak evidence gets weaker at delegation boundaries'
dek: Preserve provenance and confidence when one agent hands a claim to another.
status: draft
authors: [jordan-avery]
topics: [state, execution, evaluation]
published_at: 2026-10-02T07:00:00Z
reading_time_minutes: 3
seo:
  title: Evidence weakens across delegation
claims:
  - id: claim.brief.provenance-transfer
    text: Provenance and confidence need an explicit transfer contract when work moves between agent steps.
    evidence: inference
    sources: [opentelemetry-genai-semconv]
citations: [opentelemetry-genai-semconv]
---

Draft brief for the execution cluster. A delegated claim should carry its source reference,
retrieval time, transformation history, and confidence-not just the sentence that summarizes it.
OpenTelemetry's [GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
offer a useful precedent for naming context around model and agent operations; the provenance
contract is an application design to test.

Action: make the receiving step reject a claim with no provenance reference, and record whether the
rejection is recoverable or requires human review.
