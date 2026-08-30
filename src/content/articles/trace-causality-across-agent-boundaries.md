---
title: Preserve trace causality across agent boundaries
dek: A trace becomes useful during recovery when every model, tool, queue, and state transition keeps the same run story.
status: published
kind: deep-dive
authors: [jordan-avery]
topics: [observability, execution, state]
published_at: 2026-08-24T07:00:00Z
reading_time_minutes: 9
claims:
  - id: claim.trace.span-context
    text: OpenTelemetry uses spans and context to represent and correlate work across distributed components.
    evidence: supported
    sources: [opentelemetry-traces]
  - id: claim.trace.propagation-standard
    text: W3C Trace Context specifies interoperable HTTP propagation for trace identifiers.
    evidence: supported
    sources: [w3c-trace-context]
  - id: claim.trace.agent-fields
    text: Agent runtimes need operation and state references in addition to generic trace IDs to explain side effects.
    evidence: inference
    sources: [opentelemetry-genai-semconv]
citations: [opentelemetry-traces, w3c-trace-context, opentelemetry-genai-semconv]
related: [observing-agent-systems]
seo:
  title: Trace causality across agent boundaries
  description: Instrument agent runtimes with causal IDs for model calls, tool operations, state versions, and asynchronous recovery paths.
  noindex: false
---

The trace you need during an incident rarely ends at the model response. You need to know which
state version it read, why it requested a tool, whether the tool committed, and which worker later
resumed the run. This is a propagation problem with agent-specific evidence attached to standard
trace primitives.

## Problem

An agent starts a run from an HTTP request, publishes a queue message, calls a model, requests a
tool, and writes state. If each boundary starts a fresh trace, the observability system contains
several plausible stories. The operator can see every component and still cannot establish whether
the tool call belongs to this run or a retry.

## Invariant

Every consequential event must carry a stable `run_id`, a parent or link to the event that caused
it, an `operation_id` for side effects, and a state version where state was read or written. The
payload can be redacted; the causal references must remain.

## Primary evidence

[OpenTelemetry traces](https://opentelemetry.io/docs/concepts/signals/traces/) defines the span and
context vocabulary for following work through a distributed system. [W3C Trace
Context](https://www.w3.org/TR/trace-context/) standardizes propagation of trace context between
services. [The GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
add agent- and model-oriented fields. These standards support the instrumentation primitives; the
run and operation fields below are an application inference designed to answer the recovery
question.

## Failure mechanism

The queue consumer creates a new trace ID for every delivery. Worker A times out after sending a
tool request. Worker B receives the message and creates another trace. The tool's eventual success
appears under A, B's model decision appears under B, and the state write has neither operation ID.
The dashboard reports two short traces instead of one ambiguous operation that needs reconciliation.

## Engineering consequence

Teams then patch symptoms: increase model timeouts, disable retries, or blame the provider. None of
those actions answers whether the side effect happened. Missing causal context also makes sampling
dangerous because the one trace containing the failure may be impossible to join to its parent.

## Practice

Use standard trace context for transport and add a small business context to every event:

```json
{
  "trace_id": "transport-trace-id",
  "run_id": "run-84",
  "parent_event_id": "model-event-19",
  "operation_id": "op-42",
  "state_version": 12,
  "worker_id": "worker-b",
  "payload_ref": "vault://telemetry/payload-42"
}
```

Create a span for the model call, tool request, tool completion, state read, and state commit. For
queue redelivery, continue the run context and add a link to the delivery that triggered the
attempt; do not pretend it is a child of a worker span that may already be gone. Record the policy
decision that allowed a tool, not only the model's requested tool name.

Validate the instrumentation with a failure drill: kill a worker after the tool request, let a
replacement resume, then verify that one run view shows both attempts, one operation ID, the state
versions, and the final reconciliation result. If a reviewer still needs provider logs to decide
whether the tool committed, the local trace has not met the invariant.

## Limitations

Trace context does not make asynchronous causality truthful automatically. A component must choose
whether a new task is a child, a link, or a new run. Payload references can also become unusable
after retention expiry. Avoid recording secrets merely to improve debugging, and document sampling
rules for security-sensitive or high-impact operations.

The pillar overview is [observability for agents is a causal context problem](/articles/observing-agent-systems).
