---
title: Reliable agent systems start with invariants
dek: A practical map of retries, leases, idempotency, and recovery for agents that can cause side effects.
status: published
kind: deep-dive
authors: [jordan-avery]
topics: [reliability, execution, orchestration]
series: [agent-reliability-patterns]
published_at: 2026-08-25T07:00:00Z
reading_time_minutes: 9
claims:
  - id: claim.reliability.retry-side-effect
    text: A retry is safe only when the system can identify and reconcile the side effect it may have already started.
    evidence: supported
    sources: [aws-idempotent-apis]
  - id: claim.reliability.workflow-history
    text: Durable workflow systems use recorded execution history to resume work after a process failure.
    evidence: supported
    sources: [temporal-durable-execution]
  - id: claim.reliability.invariant-first
    text: The useful unit of reliability design is the invariant that must survive failure, not the retry loop by itself.
    evidence: inference
    sources: []
citations: [aws-idempotent-apis, temporal-durable-execution]
related: [idempotent-tool-execution-with-leases]
seo:
  description: A field guide to designing reliable AI-agent systems with explicit invariants for retries, leases, idempotency, and recovery.
  noindex: false
---

An agent that only returns text can often tolerate a bad retry. An agent that sends an email,
changes a ticket, or provisions a resource cannot. The first attempt may have reached the remote
system even when the caller saw a timeout. The right question is not “should we retry?” It is
“what must remain true if this operation runs twice, arrives late, or resumes on another worker?”

## Problem: recovery can repeat a real side effect

Agent runtimes combine model decisions with ordinary distributed-systems failure: workers die,
connections time out, queues redeliver messages, and a response can be lost after the server has
committed. A generic retry loop sees an error and sends the tool call again. It does not know
whether the error happened before or after the side effect.

## Invariant: one logical operation has one durable identity

Every side-effecting tool call needs a stable operation ID that is reused across retries and
recovery. The receiver must either return the original result for that ID or make the duplicate a
no-op. The ID is about the caller's intent, not a hash of every serialized prompt field: the same
payload can be a legitimate second purchase, while a retry can arrive with a different transport
shape.

This is the core idea in AWS's [guidance on making retries safe with idempotent
APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/). It also
puts a bound on the runtime's uncertainty: after a timeout, the runtime can reconcile by ID
instead of guessing from a transcript.

## Failure mechanism: retries, leases, and stale workers interact

Suppose worker A receives a task and writes `operation_id=op-42` to a payment adapter. A pauses
before acknowledging the queue. Its lease expires, so worker B claims the task. If the adapter
has no idempotency key, B can create a second charge. If the adapter has a key but A is still
running, A may later write a stale result over B's newer state. Idempotency handles duplicates;
fencing handles stale owners. You need both when work can outlive a lease.

## Engineering consequence: “at least once” becomes a business decision

At-least-once delivery is not automatically wrong. It is a transport property. The application
must decide which operations are safe to repeat, which need an idempotency record, and which must
be rejected until a human resolves ambiguity. Treating every tool as retryable turns an infrastructure
default into an unreviewed product policy.

## Practice: write the failure contract before the retry policy

For each side-effecting tool, record these fields:

1. `operation_id`: generated once for the logical intent and persisted with the task.
2. `owner_token`: changed when a lease is acquired; the receiver rejects an older token.
3. `state`: `started`, `committed`, `failed`, or `unknown`, with the remote reference if known.
4. `reconcile()`: a read or query by operation ID for the timeout-after-send case.
5. `retry_policy`: bounded attempts, backoff, and an explicit terminal state.

The worker flow can then be deliberately boring:

```text
load operation by operation_id
acquire lease and owner_token
if committed: return stored result
call receiver with operation_id and owner_token
if committed: store result before acknowledging the task
if timeout: reconcile by operation_id before retrying
if ambiguous: stop and surface the operation for review
```

[Temporal's durable-execution explanation](https://docs.temporal.io/encyclopedia/durable-execution)
is useful here as a model for separating workflow history from the process that happens to be
running it. You do not need that product to apply the boundary: persist enough history that a
replacement worker can distinguish “not started” from “started but not observed.”

## Limitations

An operation ID cannot make a non-cooperating external API idempotent. A compensating action may be
the only option, and compensation is not the same as rollback. Fencing also depends on the
receiver checking the token; a lease in the worker alone does not stop a delayed request. Finally,
these controls reduce duplicate and stale work, but they do not decide whether the model was
authorized to request the operation. That is a separate security boundary.

For the narrower implementation pattern, see [idempotent tool execution with leases](/articles/idempotent-tool-execution-with-leases).
