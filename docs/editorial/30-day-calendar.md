# 30-day editorial calendar

This calendar is the local launch-candidate schedule for 2026-09-01 through 2026-09-30. It maps
the five topic pillars to the eight launch articles and all ten draft weekly briefs: five briefs
have scheduled slots and five remain explicitly linked backlog inputs. A row is a planned editorial
slot, not authorization to publish: the brief records remain `draft`, and every published article
still needs the real protected-branch approval gate described in
[publication-gates.md](publication-gates.md).

The cadence follows the editorial strategy: focused engineering articles Monday through Thursday,
a concise brief on Friday, and evidence or revision work on weekends. “Required evidence” names
the minimum review object for the slot; it does not imply that a source supports a claim it does
not cover.

| Day | Date | Cadence | Pillar / topic | Launch or brief record | Required evidence |
| ---: | --- | --- | --- | --- | --- |
| 1 | 2026-09-01 | Article | Reliability | [Reliable agent systems start with invariants](../../src/content/articles/reliable-agent-systems-invariants.md) | Retry and late-arrival claims checked against AWS source; invariant and limits reviewed. |
| 2 | 2026-09-02 | Article | Reliability / execution | [Make agent tool execution idempotent with leases](../../src/content/articles/idempotent-tool-execution-with-leases.md) | Duplicate, timeout-after-commit, stale-owner, and new-intent cases tested or explicitly bounded. |
| 3 | 2026-09-03 | Article | Evaluation | [Evaluate the work an agent commits](../../src/content/articles/evaluating-agent-systems.md) | Artifact checker, transcript layer, evaluator version, and fixture boundaries documented. |
| 4 | 2026-09-04 | Brief | Evaluation / reliability | [A stronger model can still make the system worse](../../src/content/briefs/model-switching-can-regress.md) | Same fixtures and tools for both model runs; changed outcomes classified. |
| 5 | 2026-09-05 | Evidence maintenance | All clusters | Source and claim audit | Canonical URLs, access dates, and every supported/mixed claim rechecked. |
| 6 | 2026-09-06 | Editorial maintenance | All clusters | Calendar and backlog review | No filler slot added; draft boundary and next evidence owner confirmed. |
| 7 | 2026-09-07 | Article | Observability | [Observability for agents is a causal context problem](../../src/content/articles/observing-agent-systems.md) | OpenTelemetry and W3C propagation claims verified; privacy and sampling limits reviewed. |
| 8 | 2026-09-08 | Article | Observability / execution | [Preserve trace causality across agent boundaries](../../src/content/articles/trace-causality-across-agent-boundaries.md) | Worker-kill/replacement drill shows one run, operation ID, state versions, and reconciliation. |
| 9 | 2026-09-09 | Article | Security | [Secure agent systems by containing authority](../../src/content/articles/securing-agent-systems.md) | Prompt-injection risk linked to OWASP; proposal, policy, and commit boundaries reviewed. |
| 10 | 2026-09-10 | Article | Security / execution | [Tool results are data, not authority](../../src/content/articles/tool-results-are-data-not-authority.md) | Tainted-data test, target allow-list, capability scope, and policy-decision audit checked. |
| 11 | 2026-09-11 | Brief | Observability / orchestration | [Your trace shows the failure, not its origin](../../src/content/briefs/trace-failure-origin.md) | One failed run verified across queue, model, tool, and state boundaries. |
| 12 | 2026-09-12 | Evidence maintenance | Observability / security | Auditability source review | Retention, redaction, access, sampling, and export limitations recorded. |
| 13 | 2026-09-13 | Editorial maintenance | All clusters | Launch-candidate review | Human technical and editorial reviewers sign off the candidate diff, not just the outline. |
| 14 | 2026-09-14 | Article | Execution / orchestration | [Agent execution is a state machine with an unreliable worker](../../src/content/articles/executing-agent-workflows.md) | Transition table rejects stale/impossible events; resume behavior and stop states documented. |
| 15 | 2026-09-15 | Article | Reliability / execution | Reliability companion refresh | Operation IDs, leases, fencing, and reconciliation remain consistent across both launch pieces. |
| 16 | 2026-09-16 | Article | Evaluation | Evaluation companion refresh | Artifact evidence is separated from transcript judgment; failure classes are actionable. |
| 17 | 2026-09-17 | Brief | Observability / security | [Trace visibility is not auditability](../../src/content/briefs/auditability-needs-more-than-traces.md) | Evidence contract includes attributable identity, tamper posture, retention, and export path. |
| 18 | 2026-09-18 | Evidence maintenance | Reliability | Retry semantics review | Receiver behavior for duplicates, late requests, and same-payload new intent rechecked. |
| 19 | 2026-09-19 | Editorial maintenance | All clusters | Link and source audit | Internal links resolve; direct source links remain canonical and topic pages are useful. |
| 20 | 2026-09-20 | Evidence maintenance | Evaluation / reliability | Methods note review | Randomized order, reset state, evaluator memory, and comparison boundaries recorded. |
| 21 | 2026-09-21 | Article | Execution / state | Provenance transfer note | Handoff fields include source reference, retrieval time, transformation, and confidence. |
| 22 | 2026-09-22 | Article | Observability / evaluation | Cost telemetry note | Usage buckets and provider-reported billing window are reconciled before decisions. |
| 23 | 2026-09-23 | Brief | Evaluation / reliability | [Task order can fake improvement](../../src/content/briefs/evaluation-task-order.md) | Randomized order and reset-state result attached to the brief draft. |
| 24 | 2026-09-24 | Evidence maintenance | Security | Retrieval poisoning review | Harmless injected instruction is contained; unauthorized target/capability change is rejected. |
| 25 | 2026-09-25 | Editorial maintenance | All clusters | Brief readiness review | Brief has one useful action, one bounded claim, and no unsupported vendor or benchmark statement. |
| 26 | 2026-09-26 | Evidence maintenance | Security / execution | Security cluster evidence review | Proposal–policy–commit example reviewed against least privilege and human approval limits. |
| 27 | 2026-09-27 | Evidence maintenance | Reliability / execution | Lease and fencing evidence review | Expired worker cannot overwrite replacement result; ambiguity becomes `needs_review`. |
| 28 | 2026-09-28 | Brief | Reliability / execution | [A lease without fencing is only a timeout](../../src/content/briefs/lease-fencing-review.md) | Pause/resume drill demonstrates receiver-side stale-owner rejection. |
| 29 | 2026-09-29 | Article | All clusters | Launch synthesis | Pillar cross-links, source coverage, and limitations reviewed as a coherent topic graph. |
| 30 | 2026-09-30 | Editorial close | All clusters | Candidate decision | Inventory, evidence, human approvals, and externally gated actions recorded in the checklist. |

The five unscheduled draft briefs are backlog inputs for later evidence work: [provenance across
delegation](../../src/content/briefs/provenance-across-delegation.md), [provider cost
reconciliation](../../src/content/briefs/provider-cost-reconciliation.md), [retrieval
poisoning](../../src/content/briefs/retrieval-poisoning-check.md), [stop
conditions](../../src/content/briefs/agent-stop-conditions.md), and [schema as publication
control](../../src/content/briefs/schema-as-publication-control.md). They should be scheduled only
after the required evidence exists.
