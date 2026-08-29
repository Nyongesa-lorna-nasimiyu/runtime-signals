# Decision register

Date: 2026-08-28

| ID | Decision | Status | Approval |
| --- | --- | --- | --- |
| ADR-0001 | Pagefind build-time static search at launch | Accepted | Implementation may proceed in Phase 2; no search service activated yet |
| ADR-0002 | Buttondown candidate; provider-authoritative subscribers; no local DB; no webhooks at launch | Conditional | Architecture accepted; Buttondown itself pending account-level verification (pricing, DNS, consent/suppression) before integration |
| ADR-0003 | Cloudflare Web Analytics + Search Console/Bing baseline; no behavioral analytics initially | Accepted | Implementation may proceed in Phase 2; no analytics account or script activated yet |
| ADR-0004 | GitHub PRs/Actions and scheduled builds; no autonomous publishing | Accepted | Implementation may proceed in Phase 2; no scheduled workflow or AI provider activated yet |
| ARCH-0001 | Astro + React islands + Git Markdown/MDX + Workers Static Assets | User-approved provisional foundation | Already approved in brief |

Accepted means the architecture and control model are approved for Phase 2 implementation - not that any account, DNS record, paid service, or production integration is authorized. Those remain separately gated per subsystem, per the launch blockers in `docs/research/architecture-research-report.md`. ADR-0002 is Conditional: the no-local-DB, provider-authoritative, no-webhooks-at-launch architecture is accepted regardless of which provider is chosen; Buttondown as the specific provider still needs its account-level checks verified before integration begins, per that ADR's testing and launch checklist.
