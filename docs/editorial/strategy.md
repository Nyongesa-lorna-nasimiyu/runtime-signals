# Editorial strategy

## Voice

Conversational, concrete, and technically serious. Start from a failure or design pressure, then uncover the invariant. Prefer “the system loses the lease after the worker dies” to “robustness is important.” State what was measured, what was inferred, and what remains unknown.

Avoid shallow news, generic listicles, unsupported predictions, paper paraphrases, vendor marketing language, and fake certainty.

## Reusable article template

1. **Problem** — one concrete production or evaluation problem.
2. **Invariant** — the property the system must preserve.
3. **Evidence** — primary source, experiment, trace, or disclosed case.
4. **Failure mechanism** — the path from trigger to bad outcome.
5. **Engineering consequence** — why the failure matters operationally.
6. **Practice** — a bounded implementation pattern or checklist.
7. **Limitations** — workload, model, provider, and evidence boundaries.
8. **Sources and artifacts** — direct links, commits, simulations, or repositories.

## Research and fact-checking checklist

- Identify the claim before searching for support.
- Prefer original paper, standards document, provider API docs, incident report, repository, benchmark, or measured experiment.
- Record publication date, access date, version/commit, and exact supported proposition.
- Distinguish primary evidence, secondary synthesis, inference, and opinion.
- Check counterevidence and failure cases.
- Re-run code or state why it cannot be reproduced.
- Verify prices, APIs, limits, security advisories, and standards immediately before publication.
- Flag unverified claims rather than smoothing them into prose.

## Publication approval checklist

- Does the article contain a real systems problem and explicit invariant?
- Are consequential claims sourced and typed?
- Are code, commands, diagrams, citations, and links valid?
- Does the article disclose assumptions and limitations?
- Is the title descriptive rather than sensational?
- Is the author, date, update note, and correction path present?
- Are canonical, OG, JSON-LD, feed, and internal links generated?
- Does the page pass schema, accessibility, link, and performance checks?
- Has a human approved the final diff and preview?

## Sustainable daily publishing

Maintain three queues:

- **Source cards**: a primary source, finding, version, and possible invariant.
- **Article briefs**: a scoped failure mechanism and target reader job.
- **Reviewed drafts**: publication-ready pieces with artifacts and sources.

Never manufacture a daily article to fill a calendar. If the evidence is thin, publish a short note with explicit provisional status or skip the day. The Friday brief can link and synthesize; it should not become a second news feed.

## Five initial topic pillars

1. **Agent Reliability Patterns** — retries, idempotency, leases, fencing, backpressure, recovery, committed success.
2. **Agent Evaluation** — task design, artifact-aware judging, robustness, consistency, failure attribution, regression.
3. **Agent Observability** — OpenTelemetry, trace semantics, auditability, Langfuse, cost and token reconciliation.
4. **Agent Execution** — orchestration, state transfer, memory, routing, distributed execution, coding-agent harnesses.
5. **Agent Security** — tool authority, prompt injection, data boundaries, permissions, secrets, provenance.

## First ten article briefs

1. **Why switching to a stronger model can make an agent worse** — invariant: end-to-end utility is a system property; test model change against tool latency, context, evaluator, and recovery budgets.
2. **Treat model handoff as distributed state transfer** — invariant: a handoff must preserve task state, authority, and pending side effects.
3. **Your trace shows the failure—but not its origin** — invariant: observability must preserve causal context across model, tool, state, and scheduler boundaries.
4. **Trace visibility is not the same as auditability** — invariant: an audit trail must be complete, attributable, tamper-evident, and exportable.
5. **Why tool results must not inherit instruction authority** — invariant: data returned by a tool is data until an explicit policy promotes it.
6. **Reliable agents need leases, fencing tokens, and idempotency** — invariant: retries and worker replacement cannot create duplicate or stale side effects.
7. **Why artifact-aware evaluation beats transcript judging** — invariant: success is the externally committed artifact, not a plausible narration.
8. **How weak evidence propagates through multi-agent systems** — invariant: provenance and confidence must survive delegation boundaries.
9. **Why task order can fake agent self-improvement** — invariant: evaluation order must not confound learning, cache, or task familiarity effects.
10. **How provider billing and Langfuse cost telemetry diverge** — invariant: usage buckets and provider-reported charges must be reconciled before cost decisions.

