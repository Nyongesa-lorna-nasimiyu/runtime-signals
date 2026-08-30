---
title: Agent execution is a state machine with an unreliable worker
dek: Model calls are only one transition in a runtime that must schedule, persist, resume, and stop work safely.
status: published
kind: deep-dive
authors: [jordan-avery]
topics: [execution, orchestration, state]
published_at: 2026-08-29T07:00:00Z
reading_time_minutes: 8
claims:
  - id: claim.execution.composed-workflows
    text: Agent systems can be composed from predictable workflows as well as more autonomous loops, with different control and failure surfaces.
    evidence: supported
    sources: [anthropic-building-effective-agents]
  - id: claim.execution.durable-history
    text: Durable execution separates workflow progress from the lifetime of a particular worker process.
    evidence: supported
    sources: [temporal-durable-execution]
  - id: claim.execution.state-machine
    text: Making execution transitions explicit is an inference that helps a runtime reject impossible or stale transitions instead of inferring them from prose.
    evidence: inference
    sources: []
citations: [anthropic-building-effective-agents, temporal-durable-execution]
related: [trace-causality-across-agent-boundaries, idempotent-tool-execution-with-leases]
seo:
  description: A concrete model for agent execution as persisted state transitions across scheduling, model calls, tools, recovery, and stop conditions.
  noindex: false
---

The model is not the runtime. It proposes the next step inside a runtime that has queues, leases,
state stores, tool adapters, and shutdown rules. When those boundaries stay implicit, a worker
restart looks like a new conversation and a timeout looks like permission to repeat work.

## Problem: the worker's memory is mistaken for system state

A process holds a transcript, a current step, and perhaps a few tool results in memory. It dies.
The replacement worker sees a queue message and reconstructs what it can from the last checkpoint.
If the checkpoint recorded only “running,” the replacement cannot tell whether the model call
finished, whether a tool committed, or whether the prior worker still owns the lease.

## Invariant: every externally relevant transition is durable and named

Use explicit states such as `queued`, `running`, `waiting_for_tool`, `blocked`, `committed`,
`failed`, and `needs_review`. `blocked` is a reviewable stop: it means policy or capability
constraints prevent the next action, not that the task succeeded. Persist the transition with its
operation ID, actor/worker, state version, and evidence reference. A worker can be replaced; the
state machine cannot quietly forget which transitions were already committed.

Anthropic's [overview of effective agents](https://www.anthropic.com/research/building-effective-agents)
is a useful reminder that deterministic workflows and autonomous loops are different compositions.
[Temporal's durable-execution documentation](https://docs.temporal.io/encyclopedia/durable-execution)
shows the broader runtime idea: recorded history lets execution resume after process failure. The
article's state-machine framing is an inference about how to apply those ideas in an agent runtime.

## Failure mechanism: an ambiguous transition is replayed as a fresh decision

The scheduler delivers `task-7` to worker A. A calls the model, receives a tool request, and loses
the network connection while the tool runs. Worker B claims the lease and calls the model again
with a transcript that does not include the in-flight operation. B may choose a different tool or
repeat the first one. The system has created two branches but has no durable fact that they share
one logical task.

## Engineering consequence: state bugs look like model inconsistency

Operators see different answers from two runs and tune prompts, while the actual cause is missing
state or duplicate work. Without a named transition, there is also no safe place to attach retries,
timeouts, or manual intervention. The system cannot distinguish a recoverable transport failure
from a business-level rejection.

## Practice: make the transition table the runtime contract

Start with a small table and reject every transition not listed:

| From               | Event                                   | To                         | Required evidence                    |
| ------------------ | --------------------------------------- | -------------------------- | ------------------------------------ |
| `queued`           | lease acquired                          | `running`                  | owner token, attempt                 |
| `running`          | model returns tool proposal             | `waiting_for_tool`         | proposal ID, policy decision         |
| `waiting_for_tool` | tool commits                            | `running`                  | operation ID, result reference       |
| `running`          | final artifact committed                | `committed`                | artifact reference, checksum         |
| `running`          | policy denies proposed action           | `blocked`                  | policy decision, capability scope    |
| `running`          | model/tool retry budget exhausted       | `failed`                   | error class, attempt history         |
| `waiting_for_tool` | tool rejects or times out after retries | `failed`                   | operation ID, error, retry history   |
| `waiting_for_tool` | side effect outcome is ambiguous        | `needs_review`             | operation ID, reconciliation record  |
| `blocked`          | policy/capability decision is resolved  | `queued`                   | decision, approver, resume point     |
| `needs_review`     | ambiguous operation is reconciled       | `queued`                   | reconciliation result, resume point  |
| any active state   | lease expires                           | `needs_review` or `queued` | lease history, reconciliation result |

Keep model context as a projection of durable state, not the state store itself. On resume, load the
latest accepted transition, reconcile any ambiguous operation IDs, then construct the context the
model needs. This prevents a truncated transcript from silently becoming an authorization or
completion fact.

## Limitations

A state machine does not solve a badly defined task or make a tool transactional. Some transitions
remain ambiguous until an external system is queried, and `needs_review` is a real outcome rather
than a failure to automate everything. Persisting more state also increases retention, privacy,
and migration obligations. Keep the contract small enough that operators can understand it.

Continue with [reliable agent systems start with invariants](/articles/reliable-agent-systems-invariants) and [trace causality across agent boundaries](/articles/trace-causality-across-agent-boundaries).
