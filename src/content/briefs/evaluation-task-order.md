---
title: 'Weekly Brief: Task order can fake improvement'
dek: A test-design note on learning effects, cache warmth, and evaluation order.
status: draft
authors: [jordan-avery]
topics: [evaluation, reliability]
published_at: 2026-09-25T07:00:00Z
reading_time_minutes: 3
seo:
  title: Task order can fake agent improvement
claims:
  - id: claim.brief.eval-order
    text: Evaluation order can confound results when systems learn, cache, or become familiar with the task sequence.
    evidence: inference
    sources: [openai-evals]
citations: [openai-evals]
---

Draft brief for a methods cluster. If an agent can retain state, warm a cache, or adapt its plan,
then “run A then B” is not the same experiment as “run B then A.” OpenAI Evals provides a framework
for repeatable custom evaluation runs; the confounding warning is analysis to test around.

Action: randomize case order, reset declared state between runs, and report whether the evaluator
itself has memory or external calls.
