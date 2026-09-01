# Measurement policy

Runtime Signals has two measurement systems with different purposes and different
data boundaries:

1. The interaction-event contract in [`src/lib/analytics.ts`](../../src/lib/analytics.ts)
   describes bounded reader and surface interactions.
2. OpenTelemetry in [`scripts/lib/otel.mjs`](../../scripts/lib/otel.mjs) describes local
   build, CI, publication, and editorial-report operations.

These systems must remain separate. They must never be merged with each other or
with Langfuse, as required by [ADR-0003](../adr/0003-analytics-platform.md).

## Interaction-event analytics

### Retention

There is no analytics data being collected or retained today. The project has no
activated analytics account or script, and `send()` in
[`src/lib/analytics.ts`](../../src/lib/analytics.ts) has no network effect.

If a provider is approved and wired in later, [ADR-0003](../adr/0003-analytics-platform.md)
allows detailed event data to be kept for 90 days only when a decision needs it.
Monthly aggregate reports may be retained for two years. Runtime Signals does not
own a raw event log at launch; provider dashboards and approved aggregate reports
are the intended locations for any future data. This is consistent with the
telemetry retention classification of 90 days for detailed data and 24 months for
aggregates in [`docs/security/data-classification.md`](../security/data-classification.md).

### Redaction

The event contract is bounded by an allow-listed union of event names and
properties. It permits `article_view` with a slug and topics, `engaged_read` with
a slug, `search_submit` with a result count, `artifact_open` with an artifact ID,
`newsletter_cta` with no properties, and `business_cta` with a CTA ID. The
implementation does not add any other fields. `engaged_read` is sampled and has
no identity.

The contract never collects query text, URL query strings, email addresses, IP
addresses, full user agents, article draft text, prompt content, or other
free-form identifying data. These prohibitions and the allow-list are defined in
[ADR-0003](../adr/0003-analytics-platform.md) and documented in the source
comments in [`src/lib/analytics.ts`](../../src/lib/analytics.ts).

### Access

There is currently nothing to access: `send()` is an inert stub, so no provider,
Runtime Signals datastore, or analytics dashboard contains these events. The
browser `CustomEvent` dispatched by the stub is an observability/test hook, not an
external collection system; development mode may also print the event to the
developer's console.

### Failure behavior

Analytics failure must never block rendering or hydration. `track()` in
[`src/lib/analytics.ts`](../../src/lib/analytics.ts) wraps scheduling in
`try/catch`, schedules dispatch through `requestIdleCallback` when available (or
`queueMicrotask`), and wraps the `send()` call in a second `try/catch` that
swallows errors. A future provider failure therefore remains non-fatal to the
page.

## OpenTelemetry

### Retention

Today, `ConsoleSpanExporter` in [`scripts/lib/otel.mjs`](../../scripts/lib/otel.mjs)
prints spans to the process console. There is no persistent span store, OTLP
endpoint, collector, or external telemetry account. Locally, the output is in
the developer's terminal; in CI, it is in the GitHub Actions job logs. Therefore
current OTel retention is whatever local terminal/session handling or the
repository's GitHub Actions log-retention policy provides. None of the workflow
files sets an explicit `retention-days` value for job logs.

The workflows do set retention for unrelated uploaded artifacts, not OTel spans:

| Workflow artifact | Configured retention |
| --- | --- |
| Scheduled-publish audit | 90 days |
| Deploy build (`dist/`) | 30 days |
| Pull-request preview build and performance audit | 7 days |

These artifacts are not span storage, and no workflow uploads the console spans
as an artifact. The generic telemetry classification still records 90 days for
detailed data and 24 months for aggregates in
[`docs/security/data-classification.md`](../security/data-classification.md), but
those numbers do not create a retention period for the current console-only
exporter.

### Redaction

There is no separate redaction transform in `otel.mjs`. The current privacy
boundary is the bounded attribute set supplied by each `withSpan()` call site;
the wrapper records those attributes and does not receive event payloads, query
text, article bodies, prompts, email addresses, IP addresses, or full user
agents. The actual call-site attributes are:

| Span | Attributes supplied or set by the call site |
| --- | --- |
| `build.approval_manifest` | `vcs.commit.sha`, `build.manifest.authoritative`, `build.manifest.entries` |
| `build.pagefind_index` | `vcs.commit.sha`, `search.indexer`, `search.index_path` |
| `publish.approval_manifest` | `vcs.commit.sha`, `ci.repository`, conditional `github.pr.number`, `publication.authorization_established`, `build.manifest.entries` |
| `publish.scheduled_check` | `vcs.commit.sha`, `ci.repository`, `publication.due_count`, `publication.deploy_triggered` |
| `publish.deploy_dispatch` | `ci.repository`, `github.workflow`, `github.ref`, `boundary.kind` |
| `editorial_report.generate` | `github.issue.number`, `vcs.base_sha`, `vcs.head_sha`, `editorial.changed_content_count` |
| `editorial_report.post_comment` | `github.issue.number`, `github.comment.action`, `boundary.kind` |
| `observability.verify` local smoke span | `verification.mode`, `verification.result` |

The shared `withSpan()` implementation also sets `runtime.duration_ms` on every
ended span. When the wrapped operation fails, it sets `error.type` and marks the
span as failed; `error.type` is not set for a successful operation. Span status
is metadata, not an additional attribute key. The production call sites are in
[`scripts/generate-approval-manifest.mjs`](../../scripts/generate-approval-manifest.mjs),
[`scripts/run-pagefind-index.mjs`](../../scripts/run-pagefind-index.mjs), and
[`scripts/ci/`](../../scripts/ci/); the smoke span is in
[`scripts/verify-otel.mjs`](../../scripts/verify-otel.mjs).

### Access

Locally, anyone who can run the script sees its console spans in their own
terminal. In CI, anyone with read access to this repository can see the spans in
the relevant GitHub Actions job logs, subject to GitHub's permission model. No
separate OTel UI, backend account, or access-control layer exists today.

### Failure behavior

Telemetry-export failure is non-fatal. In `flush()`,
[`scripts/lib/otel.mjs`](../../scripts/lib/otel.mjs) catches errors from
`provider.forceFlush()` and logs the error instead of throwing it. The wrapped
operation has different semantics: `withSpan()` catches an operation error to
set `error.type` and the error status, then re-throws the original error. Its
`finally` block records duration, ends the span, and attempts the flush.

Consequently, a real build, publication, or editorial-report failure still fails
for its own underlying reason, while a failure to export that operation's span
does not itself fail the build or publication decision.
