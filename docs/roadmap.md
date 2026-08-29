# Implementation roadmap and gates

## Phase 1 - research and decisions

Deliverables complete in this repository:

- Product thesis and decision pack.
- Competitive analysis.
- Brand/domain shortlist.
- Stack and architecture decisions.
- Content model.
- SEO and AI-search strategy.
- Editorial strategy and article briefs.
- Cost, security, and observability direction.

Gate: user approval of masthead/domain pursuit, architecture, hosting, and newsletter evaluation.

**Resolved 2026-08-28**: architecture, hosting, search (ADR-0001), analytics (ADR-0003), and editorial automation (ADR-0004) are accepted. Newsletter architecture (ADR-0002) is accepted; Buttondown as the specific provider remains conditional pending account-level verification. Brand/domain confirmation remains open. See `docs/research/phase-1-decision-pack.md` for the resolved/open split. Phase 2 may begin.

## Phase 2 - product foundation

- Create the TypeScript/Astro workspace and pinned toolchain.
- Build design tokens, typography, responsive layout, theme, landmarks, and article chrome.
- Add typed content collections, Markdown renderer, source records, claim validation, slug collision checks, and redirects.
- Add routes for home, articles, topics, series, authors, sources, about, methodology, policy, and 404.
- Generate metadata, JSON-LD, sitemap, robots, RSS, Atom, OG images, and print styles.
- Add search index foundation; keep initial search client-side/static if content volume is small.
- Add tests for rendering, metadata, feeds, structured data, links, accessibility, and mobile layouts.

Gate: preview inspected at mobile and desktop sizes; quality gates green.

## Phase 3 - editorial and advanced features

- Add a database-backed editorial queue and source/claim review metadata only if the Git-only workflow becomes a measured bottleneck.
- Add preview tokens, scheduled build orchestration, revision history UI, SEO preview, duplicate-topic detection, and internal-link suggestions.
- Add interactive failure timelines, trace views, simulations, and paper-to-practice mappings only when each improves comprehension.
- Add Buttondown integration after consent/DNS/suppression verification.
- Add privacy-safe analytics, OTel instrumentation, and optional Langfuse correlation for AI editorial assistance.

Gate: no autonomous publishing; human approval remains mandatory.

## Phase 4 - content and SEO launch

- Write five pillar pages.
- Publish three complete launch articles plus the ten-brief backlog.
- Prepare 30-day calendar, redirects, author pages, methodology, and corrections policy.
- Register Search Console and Bing Webmaster, submit sitemap, evaluate IndexNow for publication events.
- Run Lighthouse, schema validation, link checks, accessibility audit, and visual QA.

Gate: launch checklist approved; email remains disabled until deliverability checks pass.

## Phase 5 - production readiness

- Dependency and supply-chain audit.
- Threat-model review and preview/authentication test.
- Backup/restore and export rehearsal.
- Build reproducibility check.
- Observability and alert verification.
- Deployment rollback and content correction rehearsal.
- Domain cutover and canonical verification only after explicit approval.
