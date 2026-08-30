---
title: 'Weekly Brief: A stronger model can still make the system worse'
dek: A review checklist for separating model capability from end-to-end agent utility.
status: draft
authors: [jordan-avery]
topics: [evaluation, reliability]
published_at: 2026-09-04T07:00:00Z
reading_time_minutes: 3
claims:
  - id: claim.brief.model-switch-system
    text: Model choice changes the behavior of a larger workflow whose tools, context, recovery, and evaluator also shape outcomes.
    evidence: inference
    sources: [anthropic-building-effective-agents]
citations: [anthropic-building-effective-agents]
---

Draft brief for an evaluation cluster. Before swapping models, hold the task fixtures and tool
policy constant. Compare completed artifacts, refusal/authorization failures, latency, retries,
and cost—not just transcript preference. The source-backed starting point is Anthropic's
[workflow and agent composition guidance](https://www.anthropic.com/research/building-effective-agents);
the end-to-end regression checklist is our analysis.

Action: run ten representative cases with the old and new model, classify every changed outcome,
and do not promote a model based on an aggregate score alone.
