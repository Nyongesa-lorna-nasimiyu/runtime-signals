---
title: 'Weekly Brief: Stop conditions are part of the agent contract'
dek: Define when an autonomous loop must pause, fail, or ask for a human decision.
status: scheduled
authors: [jordan-avery]
topics: [execution, reliability, security]
published_at: 2026-10-30T07:00:00Z
reading_time_minutes: 3
seo:
  title: Agent stop conditions
claims:
  - id: claim.brief.stop-conditions
    text: More autonomous agent loops require explicit bounds on steps, authority, and recovery decisions.
    evidence: inference
    sources: [anthropic-building-effective-agents]
citations: [anthropic-building-effective-agents]
---

Draft brief for the execution cluster. A practical inference from workflow composition is that
more autonomous loops need explicit bounds on steps, wall-clock budget, retry budget,
allowed capability set, and the states that require review. Anthropic's [agent composition guidance](https://www.anthropic.com/research/building-effective-agents)
shows why workflow shape changes the control surface; the exact budgets must come from the task's
risk and latency needs.

Action: add a `needs_review` outcome to one loop and test that it records the reason, last evidence,
and a safe resume point rather than silently starting over.
