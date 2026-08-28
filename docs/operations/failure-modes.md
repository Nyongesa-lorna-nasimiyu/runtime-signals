# Failure modes and recovery

Date: 2026-08-28

| Dependency/path | Failure behavior | Timeout/retry | Data loss | Target recovery |
| --- | --- | --- | --- | --- |
| Cloudflare static delivery | Last successful artifact remains the intended immutable snapshot; platform incident may affect all reading | No application retry; rely on CDN/platform | None for Git content | RTO 60 min after service recovery; verify provider status |
| Pagefind index | Search UI shows unavailable/fallback browse links; articles unaffected | Client timeout 2s, no repeated aggressive retries | Search availability only | Rebuild/redeploy index; RTO 1 business day |
| GitHub Actions | No new artifact; existing site continues | One bounded retry/manual dispatch; alert after expected run missed | None for committed content | Manual dispatch within 4h |
| Buttondown API | Generic signup failure/help link; no claim that confirmation occurred | 5s timeout, bounded exponential retry only for idempotent request | Potential pending signup; reconcile provider | Retry/manual provider check within 1 business day |
| Provider webhook | Event remains provider-authoritative; local audit projection may lag | Provider retries; verify/dedupe; periodic reconciliation | No provider data loss assumed; local event may be lost if not durable | Reconcile within 24h if a projection exists |
| Analytics | Drop measurement; never block response/render | No page retry | Metrics only | No recovery required; note gap |
| Search Console/Bing | Delayed search reporting; site unaffected | Manual retry later | Reporting gap | Review next cycle |
| AI editorial service | No automated suggestion; editor works manually | No publication retry loop | None if inputs are in GitHub | Same editorial cycle/manual |
| OTel/Langfuse | Sampling/export loss; application remains functional | Batch exporter with bounded retry and drop policy | Telemetry only | Restore backend; document gap |
| External source API | Candidate discovery delayed | Respect API quota/courtesy delay; exponential backoff; dead-letter issue | No published content loss | Manual URL/feed retry within 1 week |

No external service is on the critical path for reading. Provider SLAs and quotas must be rechecked during implementation; these targets are operational goals, not guarantees.
