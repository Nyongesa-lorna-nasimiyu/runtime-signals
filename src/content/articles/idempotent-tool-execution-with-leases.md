---
title: Make agent tool execution idempotent with leases
dek: A bounded implementation pattern for avoiding duplicate and stale side effects when workers time out or are replaced.
status: published
kind: tutorial
authors: [jordan-avery]
topics: [reliability, execution]
series: [agent-reliability-patterns]
published_at: 2026-08-23T07:00:00Z
reading_time_minutes: 10
claims:
  - id: claim.tool.idempotency-key
    text: A stable request identity lets a receiver return the result of an already-completed operation instead of performing the side effect again.
    evidence: supported
    sources: [aws-idempotent-apis]
  - id: claim.tool.late-request
    text: A late request from an expired worker can still be harmful unless the receiver checks an owner or fencing token.
    evidence: inference
    sources: []
  - id: claim.tool.ambiguous-timeout
    text: A timeout after sending a side-effecting request requires reconciliation before blind retry.
    evidence: supported
    sources: [aws-idempotent-apis]
citations: [aws-idempotent-apis]
related: [reliable-agent-systems-invariants]
seo:
  description: Implement idempotent agent tools with stable operation IDs, leases, fencing tokens, reconciliation, and bounded retries.
  noindex: false
---

Retries are necessary when a worker can lose a connection. They are dangerous when a tool can
change the world. This tutorial turns one side-effecting operation into a small protocol that can
survive a worker crash without treating “request timed out” as “request never happened.”

## Problem

The runtime asks a tool to create `ticket-123`. The tool commits the change, but the response is
lost. The worker retries. If the tool sees two ordinary requests, it may create two tickets. If a
replacement worker takes over while the first is still delayed, the old worker may also write a
stale result after the replacement has finished.

## Invariant

For one logical agent intent, the receiver must commit at most one effect, and only the current
owner may commit its result. The caller therefore sends both a stable `operation_id` and a current
`owner_token`. A duplicate operation ID returns the recorded result; an old owner token is rejected.

AWS explains the request-identity and late-arrival problem in [Making retries safe with idempotent
APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/). The
fencing rule is an application-level extension for a worker lease; it is labeled as an inference
because the source does not specify this exact agent adapter.

## Primary evidence

The relevant evidence is not a successful happy-path run. It is the receiver's durable operation
record and the response returned for a repeated ID. Test four cases: duplicate delivery, timeout
after commit, expired owner, and the same payload with a new logical operation ID. The last case
matters because payload equality is not proof of intent equality.

## Failure mechanism

The dangerous sequence is:

1. Worker A creates the operation record and receives lease token `7`.
2. A sends the request; the receiver commits but the response is lost.
3. The lease expires. Worker B receives token `8` and retries.
4. A's delayed response or cleanup arrives after B has taken ownership.

Without an operation record, B repeats the effect. Without fencing, A can overwrite B's result.

## Implementable practice

The receiver needs an operation table with a uniqueness constraint on `operation_id`, plus an
authoritative lease record. The claim must be an atomic compare-and-set: it may only succeed for a
token issued by the lease service, and it must move the operation into an in-flight state before
any side effect begins. A second concurrent request therefore gets `busy` rather than entering the
side effect at the same time.

```typescript
type Operation = {
  operationId: string;
  ownerToken: number;
  status: 'executing' | 'committed' | 'failed' | 'unknown';
  result?: { resourceId: string };
};

interface OperationStore {
  // One transaction: verify this issued token against the lease row, then claim
  // an unclaimed operation. It returns the existing result for a committed ID.
  claim(request: Request): Promise<'claimed' | 'committed' | 'busy' | 'stale'>;
  result(operationId: string): Promise<{ resourceId: string } | undefined>;
  reconcile(operationId: string): Promise<'committed' | 'not_found' | 'unknown'>;
  commit(request: Request, result: { resourceId: string }): Promise<void>;
}

async function apply(store: OperationStore, request: Request) {
  const claim = await store.claim(request);
  if (claim === 'committed') return store.result(request.operationId);
  if (claim !== 'claimed') throw new Error(`operation cannot run: ${claim}`);

  // The downstream endpoint must also validate this issued token and deduplicate
  // the operation ID. If this call times out, mark the record unknown and
  // reconcile before retrying; never enter the side effect from a busy claim.
  const resource = await createOrReuseResource(
    request.operationId,
    request.ownerToken,
    request.target,
  );
  await store.commit(request, { resourceId: resource.id });
  return { resourceId: resource.id };
}
```

`claim` must not implement fencing as “accept any token larger than the stored one.” A larger
number is not proof that a lease was issued. The lease service (or a strongly consistent lease
store) must issue the token and the receiver must validate that exact owner/version atomically;
`commit` must repeat the owner check so a late worker cannot overwrite the replacement's result.
This is a protocol sketch, not a drop-in transaction implementation.

On the caller side, persist the operation ID before the first attempt. After a timeout, mark the
operation `unknown` and call `reconcile` or an equivalent endpoint. Retry only after the receiver
proves that the operation was not committed and the lease store atomically grants a new claim. If
the result is still unknown, place the task in `needs_review` rather than guessing.

## Engineering consequence

This protocol converts an invisible duplicate into an inspectable state: `committed` with a result,
`failed` with a reason, or `unknown` awaiting reconciliation. That gives the scheduler a safe
decision point and gives an operator a resource ID to check. It also makes the tool contract more
work than “call an endpoint,” which is exactly why only side-effecting tools should carry it.

## Limitations

The receiver must participate. You cannot add idempotency after an irreversible non-queryable side
effect and recover certainty. A uniqueness constraint does not make a multi-service operation
atomic, and the example does not promise exactly-once execution across services. Use an outbox and
reconciliation protocol when the receiver and the operation record cannot share a transaction.
Fencing only works when the receiver validates an issued token, and token storage itself needs a
consistent owner source. Test the adapter against the actual downstream semantics.

The broader design is covered in [reliable agent systems start with invariants](/articles/reliable-agent-systems-invariants).
