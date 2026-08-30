# Phase 4 Checkpoint 1 launch candidate

Date: 2026-08-30
Scope: offline local launch candidate only

This report records the editorial inventory and evidence posture for the Runtime Signals launch
candidate. It does not authorize deployment, DNS, newsletter setup, analytics changes, telemetry
changes, or email. The local approval manifest is a non-authoritative development stand-in; the
real publication boundary remains the protected-branch and deployment approval described in
[publication-gates.md](publication-gates.md).

## Content inventory

| Set | Count | State | Records |
| --- | ---: | --- | --- |
| Public pillar deep dives | 5 | `published` for the local candidate | [reliable agent systems](../../src/content/articles/reliable-agent-systems-invariants.md), [evaluation](../../src/content/articles/evaluating-agent-systems.md), [observability](../../src/content/articles/observing-agent-systems.md), [execution](../../src/content/articles/executing-agent-workflows.md), [security](../../src/content/articles/securing-agent-systems.md) |
| Complete launch articles | 3 | `published` for the local candidate | [idempotent tools](../../src/content/articles/idempotent-tool-execution-with-leases.md), [trace causality](../../src/content/articles/trace-causality-across-agent-boundaries.md), [tool results](../../src/content/articles/tool-results-are-data-not-authority.md) |
| Existing live article retained | 1 | `published` | [model handoff](../../src/content/articles/model-handoff-as-distributed-state-transfer.md) |
| Weekly-brief backlog added | 10 | `draft` | [brief collection](../../src/content/briefs/) |
| Existing published brief retained | 1 | `published` | [first briefing](../../src/content/briefs/first-briefing.md) |
| Existing protected fixtures retained | 4 | mixed fixture states | archived, future, unapproved/scheduled, and draft fixtures were not rewritten |

The candidate therefore contains 9 active published articles including the retained article, 1
active published brief, and 10 intentionally non-public brief records. The 3 complete launch
articles are new; no existing article was counted as a substitute for completeness.

## Topic clusters

| Cluster | Pillar record | Supporting launch coverage |
| --- | --- | --- |
| Reliability | [reliability](../../src/content/topics/reliability.yaml) | Invariants, idempotent tools, leases, retries, reconciliation |
| Evaluation | [agent evaluation](../../src/content/topics/evaluation.yaml) | Artifact checks, evaluator layers, failure classes, task-order controls |
| Observability | [agent observability](../../src/content/topics/observability.yaml) | Causal traces, context propagation, state and operation references |
| Execution | [agent execution](../../src/content/topics/execution.yaml) | Durable transitions, worker replacement, orchestration and state |
| Security | [agent security](../../src/content/topics/security.yaml) | Prompt injection, capability boundaries, policy decisions, tainted data |

Existing `orchestration` and `state` topics remain subtopics used to connect the clusters; they
were not deleted or repurposed.

## Source and claim coverage

- The candidate adds 8 reader-facing source records, all with canonical URLs, publisher, access
  date, source type, primary-source classification, and scope/limits in notes. Publication or
  version dates and named authors are recorded when the source exposes them; access dates and
  explicit current-status notes are used for living documentation. Claim records carry the
  article-specific support relationship. Together with the 2 existing records, the source
  collection contains 10 records.
- The new articles declare 24 claims. Supported claims cite AWS, Temporal, OpenTelemetry, W3C,
  OpenAI, Anthropic, OWASP, or NIST source records. Analytical design conclusions are labeled
  `inference` rather than presented as measured facts.
- The 10 new briefs declare 10 concise claims. Supported claims cite their source records; the
  remainder are explicitly labeled `inference`.
- The schema rejects a supported or mixed claim with no source. Build-time `getEntries` resolution
  also checks that every cited source ID exists.
- Each complete launch article includes a concrete systems problem, invariant, primary evidence,
  failure mechanism, engineering consequence, implementable practice, limitations, and direct
  source links in the body. The code examples are explanatory Markdown fences, not executable MDX.

## Editorial readiness

- [x] Five pillar records are schema-valid deep dives with stable slugs and internal topic links.
- [x] Three distinct launch articles are complete for local technical and editorial review.
- [x] Ten weekly briefs are actionable drafts, not published filler.
- [x] Existing archived, future, unapproved, and draft fixtures are preserved.
- [x] Source IDs and direct links are attached to supported claims.
- [x] Limits, inference labels, author disclosure, stable paths, and topic-cluster intent are present.
- [ ] Technical reviewer confirms implementation details against the actual target runtime and
  downstream tool semantics.
- [ ] Editor confirms final voice, accessibility, link quality, and the preview.
- [ ] Maintainer records protected-branch review and deployment-environment authorization.

## External gates and remaining uncertainty

The following remain intentionally outside this offline checkpoint:

1. Real CI approval for the exact reviewed commit SHA, including required checks, CODEOWNERS, and
   deployment-environment authorization.
2. Final human technical and editorial review of the complete article bodies and examples.
3. Rechecking time-sensitive provider, framework, standards, and security source details immediately
   before publication.
4. Deployment, DNS, hosting configuration, newsletter integration, subscriber data, email sends,
   analytics, and OTel changes.

The local build can prove schema validity, route generation, draft exclusion, internal document
links, and static output. It cannot prove that a real protected environment has approved the
candidate or that an external downstream API honors an illustrative contract.
