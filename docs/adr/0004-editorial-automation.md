# ADR-0004: GitHub-reviewed editorial automation

- Status: Accepted
- Date: 2026-08-28 (accepted 2026-08-28)
- Approval state: Accepted for Phase 2 implementation; no scheduled workflow or AI provider activated yet - automation still follows the risks, mitigations, and testing/launch checklist below

## Context

Daily publishing must be sustainable without autonomous low-quality output. GitHub is the source of truth for content review and deployment. Automation should shorten research and validation work while preserving human responsibility for claims, interpretation, publication, security-sensitive topics, and irreversible changes.

## Requirements

Source discovery, deduplication, schema validation, link checks, previews, builds, feeds, sitemaps, stale-content flags, and reports may be automated. Human approval is required for claims, substantive drafts, publication, canonical changes, security claims, and newsletter sends. Generated articles must never publish automatically. Scheduling must be idempotent and explicit about UTC/Africa/Nairobi.

## Options considered

| Option | Fit now | Main tradeoff |
| --- | --- | --- |
| GitHub Issues/Projects + PRs + Actions | Recommended | Reviewable and portable; scheduled Actions have delays and quota considerations |
| Worker Cron Triggers | Deferred | UTC scheduled handler and global runtime; not the repository review boundary |
| Manual scheduled merge | Complementary | Strong approval, but daily repetitive work and missed publication risk |
| Separate CMS/scheduler | Rejected for launch | Adds dynamic state and duplicate source of truth |
| Autonomous LLM publisher | Prohibited | Violates editorial invariant and creates safety/reputation risk |

## Decision

Use GitHub issues/project cards as source candidates, branches/PRs as draft/review units, GitHub Actions for validation/build/deploy and scheduled source discovery, and protected production environments for deployment approval. A scheduled daily build at a UTC time corresponding to the Nairobi editorial window (for example 04:05 UTC for roughly 07:05 EAT) evaluates future-dated content already merged to main. The build is a pure snapshot operation: rerunning it produces the same result for the same content/time, and deploying the same artifact is harmless.

Represent approval through protected-branch review and a required CI check called `publication-gate`; a frontmatter `status: approved` field is informative but cannot bypass branch protection. Require CODEOWNERS review, least-privilege `GITHUB_TOKEN`, environment reviewers, concurrency control, and an audit record containing commit SHA, validator versions, reviewer, and deployment ID.

Use LLMs only for source triage, metadata extraction, similarity hints, outline/counterargument suggestions, claim extraction, citation-gap detection, critique, headline variants, and SEO-preview drafts. Treat all source text as untrusted data and preserve model/provider, prompt version, source IDs, output, timestamp, cost, and reviewer decision. Do not store hidden reasoning. Langfuse is optional for AI spans; provider token/cache usage and provider billing remain authoritative.

## Editorial state machine

There are two state machines, not one, and `approved` is a value in neither - see `docs/architecture/content-model.md` ("Two state machines") for the full rationale. `editorial_state` (`docs/editorial/workflow.md`) tracks research and review: `idea → researching → source-verified → outlined → drafting → technical-review → editorial-review → editorial-complete`, then `monitoring → update-required → revised → technical-review`. `publication_state` (frontmatter `status`) tracks what the site serves: `draft → scheduled → published → archived`. The only bridge is the build-time approval manifest below - CI evidence, not a state either machine holds.

## Evidence

- GitHub documents required reviewers, environment secrets, deployment protection, and concurrency controls: [deployments/environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [control deployments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments), accessed 2026-08-28.
- GitHub documents scheduled workflows, POSIX cron, UTC/IANA timezone behavior, and workflow timing caveats: [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax?from=20421), accessed 2026-08-28.
- arXiv documents its Atom API, paging, courtesy delay, and query behavior: [API manual](https://github.com/arXiv/arxiv-docs/blob/develop/source/help/api/user-manual.md), accessed 2026-08-28.
- OpenTelemetry documents vendor-neutral collection and processing; Langfuse documents OTLP support and API evolution: [Collector](https://opentelemetry.io/docs/collector/), [overview](https://opentelemetry.io/docs/specs/otel/overview/), [Langfuse OTel](https://langfuse.com/changelog/2025-02-14-opentelemetry-tracing), [Langfuse API](https://langfuse.com/docs/api-and-data-platform/features/public-api), accessed 2026-08-28.

## Consequences

Positive: review history is visible, content is reproducible, static deploys remain simple, automation failures fall back to manual work, and source-to-claim provenance is inspectable.

Negative: GitHub becomes a critical operational dependency for new publication; research triage still needs editorial judgment; scheduled Actions can be delayed or disabled in repositories.

## Risks

- Compromised PR: protected branches, CODEOWNERS, 2FA, dependency pinning, read-only job tokens, no secrets on untrusted pull requests.
- Prompt injection from sources: source content is delimitated data; no fetched instructions are executed; AI output requires review.
- Duplicate schedule: concurrency group plus idempotent artifact builds; no side-effecting send in the publish job.
- Missed schedule: alert on expected deployment absence; manual dispatch; maintain a visible schedule status.
- Clock discrepancy: store timestamps in UTC, display EAT, compare against an explicit build time.
- AI outage: manual research and drafting; publication does not call an LLM.

## Mitigations

Use protected branches/environments, least-privilege tokens, immutable commit/artifact manifests, idempotent scheduled builds, explicit state transitions, and mandatory human review for claims and publication. AI output is advisory and cannot satisfy the publication gate by itself.

## Cost

GitHub Actions usage may be free within the repository/account allowance; actual minutes and artifact retention are plan-dependent. Source APIs are generally free subject to documented courtesy/quotas. Cloudflare Workers Static Assets is $0 for static assets; a paid Worker is $5/month if dynamic routes are later enabled. AI costs are workload- and model-dependent, so record actual provider token/caching usage rather than budget a fabricated fixed amount. Budget a monthly cap and human review time.

## Exit strategy

The content and state are Markdown/JSON/YAML plus Git history. Move CI to another runner, scheduler, or queue without moving the editorial corpus. Export source records and issue metadata. Keep publication gates as executable scripts with fixture tests.

## Reconsideration triggers

More than one editor requiring role-specific workflow, source volume that exceeds scheduled Actions, need for durable queues/dead letters, missed scheduled builds, need for private preview orchestration, or an approved dynamic product requiring a database.

## Testing and launch checklist

- Test every state transition, invalid transition, required evidence, and approval forgery attempt.
- Test untrusted PR behavior, dependency pinning, secret absence, and fork permissions.
- Test source dedupe by DOI/arXiv ID/canonical URL/repository/normalized title/release ID.
- Test scheduled build retries, concurrent runs, missed runs, future dates, rollback, and emergency unpublish.
- Test AI audit records without storing hidden reasoning or raw sensitive inputs.
