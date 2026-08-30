---
title: Observability for agents is a causal context problem
dek: A useful agent trace connects model decisions, tool effects, state changes, and scheduler events without pretending they are one operation.
status: published
kind: deep-dive
authors: [jordan-avery]
topics: [observability, orchestration, state]
published_at: 2026-08-27T07:00:00Z
reading_time_minutes: 8
claims:
  - id: claim.observability.trace-path
    text: OpenTelemetry traces model a request as a path through distributed components using spans and propagated context.
    evidence: supported
    sources: [opentelemetry-traces]
  - id: claim.observability.context-propagation
    text: W3C Trace Context defines interoperable propagation fields so distributed services can correlate work.
    evidence: supported
    sources: [w3c-trace-context]
  - id: claim.observability.causal-chain
    text: A trace is operationally useful only when its identifiers preserve the causal chain across agent, tool, state, and scheduler boundaries.
    evidence: inference
    sources: []
citations: [opentelemetry-traces, w3c-trace-context, opentelemetry-genai-semconv]
related: [trace-causality-across-agent-boundaries]
seo:
  description: A practical guide to tracing AI agents across model calls, tools, state stores, and schedulers while preserving causal context.
  noindex: false
---

An agent trace can be full of spans and still fail at the only question an on-call engineer has:
“what caused this side effect?” A model call, a tool request, a queue delivery, and a state write
are different operations. The trace needs to connect them without flattening their boundaries.

## Problem: visibility stops at the model boundary

Many systems record a model request and a final answer but omit the scheduler decision that caused
the request, the exact tool arguments, or the state version read before the decision. When a run
fails, the trace proves that the model was called; it does not show whether the wrong state was
loaded, a tool response was misinterpreted, or a delayed worker committed the result.

## Invariant: every consequential transition has an attributable context

For each transition that can change behavior or state, preserve a run ID, parent operation ID,
actor/worker identity, and input/output references. The references can point to redacted or hashed
payloads; they do not require copying secrets into every span. What matters is that an investigator
can follow the causal chain and identify which component made which decision.

[OpenTelemetry's traces documentation](https://opentelemetry.io/docs/concepts/signals/traces/)
describes spans and context as the primitives for following work through a distributed system.
[W3C Trace Context](https://www.w3.org/TR/trace-context/) provides a standard propagation format
for carrying that correlation across service boundaries. The agent-specific field choices still
belong to the application; [OpenTelemetry's GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
are a useful starting point, not a substitute for a causal model.

## Failure mechanism: correlation is copied, not propagated

Suppose a queue consumer starts a new trace ID for every delivery. The model span is visible, and
the tool span is visible, but a retry appears to be an unrelated request. If the original worker
was still alive, two spans may claim the same business operation. If a state write fails, there is
no reliable way to tell whether the model saw the old state or the write was simply lost after the
decision.

## Engineering consequence: teams optimize the wrong boundary

Without causal context, operators blame the model for a timeout caused by a saturated tool, or add
model retries to a state-store consistency problem. The resulting fix can amplify load and create
new duplicates. Observability is not just a dashboard concern; it changes which recovery action the
team considers safe.

## Practice: model the run as a linked evidence ledger

Start with a small event vocabulary:

| Event             | Required identity     | Useful evidence                 |
| ----------------- | --------------------- | ------------------------------- |
| `run.started`     | run ID, request ID    | actor, policy version           |
| `model.called`    | run ID, step ID       | model/provider, input reference |
| `tool.requested`  | run ID, operation ID  | tool name, argument reference   |
| `tool.completed`  | operation ID          | result reference, error class   |
| `state.committed` | run ID, state version | changed keys, writer token      |
| `run.finished`    | run ID                | outcome, artifact reference     |

Propagate the run and parent IDs through the queue, attach a stable operation ID to side effects,
and record state versions rather than only “success.” Keep sensitive content out of attributes by
default; store a controlled reference with retention and access policy. Finally, test the trace
with a deliberately failed run and verify that a reviewer can answer what happened without opening
the model provider console.

## Limitations

Tracing cannot recover data that was never recorded, and more attributes do not automatically mean
more truth. Sampling can remove the one failure you need, while payload capture can create a privacy
or secret-exposure problem. Context propagation also does not prove causality when a component
creates work asynchronously without declaring a parent or link. Document those gaps instead of
calling the trace complete.

The implementation companion is [trace causality across agent boundaries](/articles/trace-causality-across-agent-boundaries).
