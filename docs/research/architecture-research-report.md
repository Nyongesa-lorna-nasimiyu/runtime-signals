# Architecture research report: four launch subsystems

Date: 2026-08-28  
Scope: Search, newsletter subscriptions, analytics, editorial research/publishing automation

## Executive recommendations

| Subsystem | Recommendation | Confidence | Monthly cost at launch | Main risk | Exit strategy | Approval needed |
| --- | --- | ---: | ---: | --- | --- | --- |
| Search | Pagefind post-build static index | High | $0 | Large/multilingual archive limits | Reuse JSON index contract with Orama/hosted search | Yes |
| Newsletter | Buttondown candidate; provider authoritative; no local DB | Medium-high | $0 for first 100 subscribers currently shown; verify beyond | Pricing/model and provider dependency | Export state, migrate via adapter | Yes |
| Analytics | Cloudflare Web Analytics + Search Console + Bing; no behavior tool initially | High | $0 | Limited custom interaction insight | Add Plausible/Umami/first-party events behind contract | Yes |
| Editorial automation | GitHub Issues/PRs/Actions + protected deploy + scheduled builds | High | $0 within account allowances | Scheduled job delay / GitHub dependency | Move runners/scheduler; content stays Git | Yes |

Costs are snapshots, not quotes. Recheck immediately before activation.

## Evidence versus inference

Verified facts are linked directly in each ADR. Key current-source findings:

- Cloudflare recommends Workers for new projects and documents Workers Static Assets, Astro deployment, static asset limits, pricing, and Cron behavior: [Workers guidance](https://developers.cloudflare.com/pages/get-started/), [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Astro on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/), [pricing](https://developers.cloudflare.com/workers/platform/pricing/), [limits](https://developers.cloudflare.com/workers/platform/limits/), [Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/), accessed 2026-08-28.
- Astro Content Collections support schema-validated build-time content: [content collections](https://docs.astro.build/en/guides/content-collections/), accessed 2026-08-28.
- Pagefind is a post-build, chunked static search system with browser API, filters, and multilingual support: [Pagefind](https://pagefind.app/), [running](https://pagefind.app/docs/running-pagefind/), [API](https://pagefind.app/docs/api/), accessed 2026-08-28.
- Buttondown documents mandatory/default double opt-in, API subscriber states, exports, HMAC webhooks, and current add-on pricing: [double opt-in](https://docs.buttondown.com/double-opt-in), [subscriber API](https://docs.buttondown.com/api-subscribers-create), [webhooks](https://docs.buttondown.com/api-webhooks-introduction), [exports](https://docs.buttondown.com/api-exports-introduction), [pricing](https://buttondown.com/pricing), accessed 2026-08-28.
- Resend documents contacts, delivery events, suppressions, unsubscribe requirements, and current free/paid sending plans: [pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing), [events](https://resend.com/docs/webhooks/event-types), [suppressions](https://resend.com/docs/dashboard/emails/email-suppressions), accessed 2026-08-28.
- Cloudflare Web Analytics claims a privacy-first, no-personal-data RUM model; Search Console and Bing document search-performance, sitemap, and IndexNow workflows: [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/about/), [Search Console](https://developers.google.com/search/docs/monitor-debug/search-console-start?hl=en), [Bing sitemaps](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed), [IndexNow](https://www.bing.com/webmasters/help/indexnow-0z209wby), accessed 2026-08-28.
- GitHub documents protected environments, required reviewers, workflow schedules/timezones, and secure use guidance: [environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax?from=20421), [secure use](https://docs.github.com/en/actions/reference/security/secure-use?learn=getting_started&learnProduct=actions), accessed 2026-08-28.
- OpenTelemetry is vendor-neutral; Langfuse accepts OTel but its derived cost must not replace provider usage/billing: [OTel Collector](https://opentelemetry.io/docs/collector/), [Langfuse OTel](https://langfuse.com/changelog/2025-02-14-opentelemetry-tracing), [Langfuse cost tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking), accessed 2026-08-28.

Recommendations and thresholds are inferences from the product constraints and these sources. They require fixture tests and operational measurements before implementation is accepted.

## Requirement matrix

| Need | Launch answer | Deferred answer |
| --- | --- | --- |
| Lexical search | Pagefind | Orama/hosted search after measured threshold |
| Semantic/evidence search | No | Evaluation set first; then hybrid/vector if task success improves |
| Confirmed subscription | Buttondown double opt-in candidate | Provider adapter / local projection if required |
| Audience measurement | Cloudflare Web Analytics | Plausible/Umami only for an identified decision |
| Search measurement | Search Console + Bing | Data warehouse only if editorial scale requires it |
| Source monitoring | GitHub scheduled Action + public APIs/feeds | Worker queue/cron when Actions are insufficient |
| Publication scheduling | Future-dated content + scheduled build | Dedicated scheduler only after missed-run evidence |
| AI assistance | Review aids and metadata only | No autonomous publishing |

## Cost model

| Scale | Hosting/build | Search | Newsletter | Analytics | Storage/DB | AI/observability | Expected baseline |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Launch | $0 static assets; GitHub allowance | $0 | $0 first 100 shown | $0 baseline | $0 | variable / optional | $0 plus domain |
| 10k monthly page views | same | $0 | provider tier | $0 | $0 | variable | $0 plus provider choice |
| 100k monthly page views | same; $5 Worker only if dynamic route | $0 | provider tier | $0 baseline | $0 | variable | $0–$5 plus provider choice |
| 1k subscribers | same | $0 | Buttondown price requires account verification; Resend comparison has paid tiers by use | $0 baseline | $0 local DB | variable | verify quote before lock |
| 10k subscribers | same | likely $0 if static index | verify provider tier; Resend pricing is explicit by contact tier | $0 baseline | $0 local DB | variable | provider-driven |
| 1k articles | build minutes and asset count to measure | $0 | unchanged | unchanged | $0 | build/AI variable | within documented Worker file limits if tested |
| 10k articles | build time/index size must be benchmarked; paid Worker Static Assets supports more files than free | $0 until threshold | unchanged | unchanged | $0 | build/AI variable | benchmark gate required |

Durable cost controls: no request-time LLM calls; static cache; cap Action artifact retention; export newsletter data monthly; record model token/cache usage; set provider budget alerts. AI cost cannot be honestly fixed without selecting a model and workload; use `input_tokens × provider_rate + output_tokens × provider_rate + tool/API costs` as the budget formula.

## Proof-of-concept plan

The repository has no application package or dependency lockfile yet. Local, non-production POCs are therefore specified in [`docs/poc/README.md`](../poc/README.md) and use standard Node only. They establish contract and payload boundaries, not provider SLAs.

## Explicitly rejected options

These were evaluated and rejected for launch, not merely deferred. They remain listed per-subsystem in each ADR's options table; this is the consolidated view.

| Subsystem | Rejected option | Why rejected |
| --- | --- | --- |
| Architecture | Convex | No concrete launch requirement it solves better than a static build plus a bounded Worker route; see ADR 003 in `docs/decisions/`. |
| Architecture | Express | Adds a deployable service, secret boundary, and runtime with no current requirement. |
| Search | Cloudflare AI Search / Vectorize | Semantic capability is premature for launch content volume; currently beta with pricing subject to change. |
| Search | PostgreSQL / Convex full-text search | Requires a database and request-time availability for a publication that should read without one. |
| Newsletter | Ghost | Newsletter/members are capable, but adopting it would replace the already-approved Astro/Git source architecture. |
| Analytics | Google Analytics | More invasive data collection than any launch decision requires. |
| Editorial automation | Separate CMS/scheduler | Adds dynamic state and a second source of truth alongside Git. |
| Editorial automation | Autonomous LLM publisher | Prohibited outright: violates the editorial invariant (human approval for every claim and publication) and creates uncontrolled reputation/safety risk. |

## Launch blockers

Items that must be true before the site can go live in front of readers, regardless of which subsystem recommendations are approved:

1. All four ADRs (0001–0004) approved or explicitly revised — see the decision register.
2. Domain `runtimesignals.tech` registrar access, DNS control, renewal, and privacy settings verified; trademark/social-handle check completed (the brand report's RDAP check is not legal clearance).
3. Astro workspace, typed Content Collections, and schema validation built and passing (Phase 2 gate in `docs/roadmap.md`).
4. `publication-gate` CI check wired into branch protection before any scheduled build is enabled — a `status: approved` frontmatter field alone must not be able to publish. This includes the approval manifest itself (`src/lib/approval.ts`): the Phase 2 build reads `scripts/generate-approval-manifest.mjs`'s output, which is explicitly a local, trust-everything dev stand-in (documented in that script and in `docs/editorial/publication-gates.md`) — it must never be what production builds from. The real manifest must be generated by the deploy workflow itself, from GitHub's actual protected-branch review state, required check-run results, CODEOWNERS approval, and deployment-environment authorization, bound to the exact commit/content digest being built — never from a script an untrusted content-branch workflow could run or influence.
5. If the newsletter is enabled before launch: SPF, DKIM, DMARC, and Return-Path verified in a test domain, and consent/suppression/export tests pass. Production email stays disabled until all of these pass, per ADR-0002.
6. Preview deployments confirmed unguessable, noindex, and free of production secrets or subscriber data.
7. Backup/export rehearsal completed for any provider holding subscriber data (Phase 5 gate).
8. Structured data, sitemap, and Search Console/Bing ownership verified before relying on organic discovery.
9. A named incident owner and second contact assigned before any production account is activated, per `docs/security/incident-response.md`.

## Approval gate

Resolved 2026-08-28: ADR-0001 (search), ADR-0003 (analytics), and ADR-0004 (editorial automation) are **accepted** for Phase 2 implementation. ADR-0002 (newsletter) is **accepted as an architecture** — provider-authoritative, no local subscriber database, no webhook endpoint at launch — with Buttondown remaining **conditional** pending its account-level verification (current pricing/quotas/DPA, DNS authentication, consent/suppression behavior) before integration begins.

Acceptance authorizes Phase 2 implementation work (the Astro scaffold and the deferred POCs). It does not authorize accounts, DNS, production integrations, paid plans, email, or public deployment; those remain separate launch-blocker items, tracked above.
