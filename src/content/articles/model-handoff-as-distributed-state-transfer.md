---
title: Treat model handoff as distributed state transfer
dek: A handoff between agent steps is a state boundary, not a prompt concatenation trick.
status: published
kind: article
authors: [jordan-avery]
topics: [orchestration, state]
series: [agent-reliability-patterns]
published_at: 2026-06-01T07:00:00Z
revisions:
  - date: 2026-08-29T00:00:00Z
    note: Added a minimal TypeScript example of an enforced transfer contract, illustrating "the practice" concretely.
    type: update
reading_time_minutes: 6
claims:
  - id: claim.handoff.state-boundary
    text: A multi-step agent handoff can silently lose context unless the transfer contract is explicit about what state crosses the boundary.
    evidence: inference
    sources: []
  - id: claim.otel.genai-semconv
    text: OpenTelemetry publishes standard span and attribute conventions for GenAI provider, operation, and agent instrumentation.
    evidence: supported
    sources: [opentelemetry-genai-semconv]
citations: [opentelemetry-genai-semconv]
artifacts: [handoff-simulation]
seo:
  description: Why a handoff between agent steps should be designed as an explicit state-transfer contract, not an implicit prompt concatenation.
  noindex: false
---

When one model or agent step hands work to the next, the handoff is usually implemented as
"append the transcript so far and continue." That works until the receiving step needs something
the transcript doesn't carry explicitly: a partial tool result, a constraint the first step
resolved but never restated, or the reason a prior attempt failed.

## The failure mechanism

Treating a handoff as string concatenation hides the state boundary. Nothing forces an author to
enumerate what must survive the handoff, so it's easy to lose exactly the information a recovery
path needs - often only visible after a retry silently redoes work the first attempt already
completed.

## The invariant

A handoff is a state transfer with a boundary. Anything the next step needs - completed
sub-results, open constraints, failure history - has to be part of an explicit transfer contract,
not an implicit assumption about what the transcript will happen to contain.

## The practice

Define the transfer contract as a typed structure, not a prompt string: what must be present,
what's optional, and what a receiving step should do if a required field is missing. This mirrors
how OpenTelemetry standardizes what a GenAI span records, rather than leaving span attributes to
whatever a given SDK happens to log.

A minimal version of that contract, enforced rather than assumed:

```typescript
interface HandoffState {
  completedSubResults: Record<string, unknown>;
  openConstraints: string[];
  priorFailure?: { step: string; reason: string };
}

function receiveHandoff(state: Partial<HandoffState>): HandoffState {
  if (!state.completedSubResults) {
    throw new Error(
      'Handoff rejected: completedSubResults is required, not inferred from transcript.',
    );
  }
  return { openConstraints: [], ...state, completedSubResults: state.completedSubResults };
}
```

The receiving step fails loudly on a missing required field instead of silently guessing from
whatever the transcript happens to contain.

## Limitations

This applies to explicit multi-step orchestration; a single continuous context window doesn't have
the same boundary. The simulation referenced above reproduces one failure shape, not an exhaustive
survey of handoff designs.
