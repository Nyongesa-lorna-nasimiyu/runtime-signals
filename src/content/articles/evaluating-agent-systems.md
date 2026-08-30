---
title: Evaluate the work an agent commits, not the story it tells
dek: An evaluation is useful when its assertions are tied to an observable task result and a known failure budget.
status: published
kind: deep-dive
authors: [jordan-avery]
topics: [evaluation, reliability, state]
published_at: 2026-08-26T07:00:00Z
reading_time_minutes: 8
claims:
  - id: claim.evaluation.custom-evals
    text: Evaluation frameworks can register task-specific evaluators instead of limiting measurement to a model's generated transcript.
    evidence: supported
    sources: [openai-evals]
  - id: claim.evaluation.workflow-choice
    text: Agent workflows and more autonomous agents expose different reliability and evaluation surfaces.
    evidence: supported
    sources: [anthropic-building-effective-agents]
  - id: claim.evaluation.artifact-over-transcript
    text: When a task changes an external system, the committed artifact is stronger evidence of success than a plausible final explanation.
    evidence: inference
    sources: []
citations: [openai-evals, anthropic-building-effective-agents]
seo:
  description: How to evaluate AI agents using task contracts, committed artifacts, failure taxonomies, and reproducible evidence instead of transcript quality alone.
  noindex: false
---

“The agent said it completed the task” is an observation about language generation. It is not yet
an observation about the task. If the task was to update a record, produce a patch, or send a
carefully scoped request, the evaluator needs to inspect that result and the constraints around it.

## Problem: a fluent transcript can hide an incomplete task

A transcript judge may reward an answer that sounds decisive even when the tool call failed, the
file was written to the wrong path, or the agent skipped a required approval. The opposite also
happens: a terse transcript can look poor while the externally visible artifact is correct. The
evaluation target has drifted from the user's job to the model's narration.

## Invariant: success is defined by the task contract

Before running an evaluation, write a contract with three parts: the input, the allowed actions,
and the observable outcome. The outcome should be something a separate checker can inspect. A
transcript can be additional evidence for reasoning quality, but it should not be the sole proof
of a side effect.

This is compatible with the extensible evaluator model in [OpenAI
Evals](https://github.com/openai/evals), which supports a registry and custom evaluations. The
source supports the capability; the decision to make an artifact authoritative is an engineering
inference for the task at hand.

## Evidence: change the evaluator when the workflow changes

The workflow itself shapes the failure surface. Anthropic's [description of effective
agents](https://www.anthropic.com/research/building-effective-agents) distinguishes composed
workflows from more autonomous agent loops. A fixed sequence is easier to bound but may fail on
unexpected inputs; a flexible loop can adapt but needs stronger stop conditions and traces. An eval
that only measures final text will miss both differences.

## Failure mechanism: aggregate scores erase distinct failures

Imagine ten tasks with the same 80% score. In one run, the agent fails two harmless formatting
checks. In another, it makes one unauthorized write and one silent omission. The average is equal,
but the operational risk is not. A single pass rate hides the failure mechanism unless the evaluator
records failure categories and severity.

## Engineering consequence: model comparisons become misleading

Changing the model, prompt, tool timeout, or task order can move the aggregate score. Without a
stable task set, fixed tool permissions, and a failure taxonomy, the comparison cannot tell you
which system property moved. “Model B scored higher” is an incomplete result if B also used more
steps, a different retry policy, or a more forgiving checker.

## Practice: make each case produce evidence in layers

Use a small evaluation record that is boring to diff:

```yaml
case: update-customer-address
input_fixture: fixtures/address-017.json
allowed_tools: [lookup_customer, write_address]
artifact_check: address_matches_expected_and_audit_event_exists
transcript_check: explains_uncertainty_without_claiming_success_early
failure_class: null
severity: null
```

Then run the same cases in a controlled order and store:

- the final artifact or a hash of it;
- tool calls, arguments, results, and authorization decisions;
- latency, retries, and token/step counts where available;
- a failure class such as `wrong_target`, `duplicate_write`, `missing_evidence`, or `unsafe_action`;
- the evaluator version and task fixture version.

Keep transcript judging as one layer. Use a deterministic artifact checker wherever possible, and
have a human review only the cases whose evidence is genuinely ambiguous. The goal is not to turn
every judgment into a brittle regex; it is to make the source of a pass or fail inspectable.

## Limitations

Artifact checks can overfit to one representation and miss quality that is difficult to encode.
Model-based judges introduce their own variance and can share blind spots with the evaluated model.
Small task sets are useful for regression detection, not claims about general intelligence. Report
the fixture, evaluator, and environment boundaries so a score is not mistaken for a universal
property.

The same contract can be applied to any task where the result is more important than the explanation:
make the artifact check explicit, retain the evidence, and label what remains judgment.
