# Runtime Signals observability

## Scope

Runtime Signals uses OpenTelemetry only for infrastructure and CI observability. It records whether build and publication operations succeed, how long they take, and bounded operational metadata that helps diagnose failures. It does not record reader behavior, search terms, article content, prompts, email addresses, or other personal data.

This telemetry is deliberately separate from the client interaction-event contract in `src/lib/analytics.ts`. The two systems have different purposes and must not be merged. OpenTelemetry is also not a Langfuse integration; Langfuse remains isolated to future AI-editorial work and is out of scope here. This follows [ADR-0003](../adr/0003-analytics-platform.md), including its explicit separation rule.

## Instrumented boundaries

| Span | Boundary | Recorded operational metadata |
| --- | --- | --- |
| `build.approval_manifest` | Local `prebuild` manifest generation | Checked-out commit SHA, manifest entry count, non-authoritative local mode, duration, success/failure |
| `build.pagefind_index` | `postbuild` Pagefind invocation | Checked-out commit SHA, indexer name, index path, duration, success/failure |
| `publish.approval_manifest` | CI-only real approval-manifest generation | Commit SHA, repository, merged PR number when available, authorization result, manifest entry count, duration, success/failure |
| `publish.scheduled_check` | Scheduled-publish watermark and due-content decision | Commit SHA, repository, due count, dispatch decision, duration, success/failure |
| `publish.deploy_dispatch` | GitHub Actions `POST /actions/workflows/deploy.yml/dispatches` | Repository, workflow, ref, outbound-trigger classification, duration, success/failure |
| `editorial_report.generate` | PR editorial report generation | PR number, base/head SHAs, changed-content count, duration, success/failure |
| `editorial_report.post_comment` | GitHub API comment create/update call | PR number, create/update action, outbound-notification classification, duration, success/failure |

Pagefind is the static search indexer, so its one `build.pagefind_index` span is also the search-boundary span. There is no separate runtime search service to instrument.

## Webhook-boundary interpretation

The repository has no inbound webhook receiver. Buttondown newsletter integration is deferred, and `docs/decisions/004-newsletter.md` describes signature verification as a future pre-send gate. No fictional webhook endpoint or receiver is represented here.

For this checkpoint, “webhook boundary” means the real outbound handoff where a script crosses into another system: the scheduled-publish script dispatches `deploy.yml` through the GitHub API, and the editorial-report script creates or updates a GitHub PR comment. Those calls are instrumented as outbound trigger/notification spans. They are analogs for a boundary, not literal inbound webhook instrumentation.

## Exporter posture

The shared setup in `scripts/lib/otel.mjs` registers a `ConsoleSpanExporter` directly. It does not read an OTLP endpoint, create an external account, use an API token, or send telemetry outside the local process. Running `npm run verify:otel` prints one sample span for manual inspection.

Production deployment now uses authenticated `wrangler deploy` after the protected GitHub Environment approval. The OTel exporter remains console-only: no OTel account or collector is configured, so instrumentation stays testable without creating an operational dependency or changing the privacy boundary of the site.

If a real backend is approved later, the change should be additive: keep span names, bounded attributes, privacy rules, and script boundaries stable, then replace or extend the exporter configuration in `scripts/lib/otel.mjs` with an explicitly approved exporter and secret-managed endpoint. That future change requires a separate account/secret approval and verification; it is not part of this checkpoint.

## Local verification

The normal build emits spans for both the prebuild manifest and postbuild Pagefind steps:

```sh
npm run build
```

The smoke command emits a single local span without touching GitHub or another service:

```sh
npm run verify:otel
```

CI scripts require their existing GitHub environment variables and permissions. Their OTel spans add no new credentials or API calls.

## Langfuse

Langfuse is explicitly out of scope for this checkpoint. It is reserved for
future AI-assisted editorial work, consistent with the
[editorial automation policy](../editorial/automation-policy.md), which requires
AI execution telemetry to remain separate from web and runtime telemetry and
keeps provider records authoritative for billing.

If Langfuse instrumentation is added later, it must use its own tracer and
pipeline. It must never be layered onto the existing tracer in
[`scripts/lib/otel.mjs`](../../scripts/lib/otel.mjs) or merged into the
interaction-event contract in [`src/lib/analytics.ts`](../../src/lib/analytics.ts),
per [ADR-0003](../adr/0003-analytics-platform.md).
