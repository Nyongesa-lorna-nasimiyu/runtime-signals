# Data classification

Date: 2026-08-28

| Class | Examples | Allowed systems | Controls | Retention |
| --- | --- | --- | --- | --- |
| Public | Published HTML, citations, feeds, diagrams | Cloudflare, GitHub public repo | Review and content integrity | Indefinite while published |
| Editorial internal | Drafts, review comments, source notes, unpublished claims | Private GitHub issues/PRs, approved local workstations | Least privilege, branch protection, no public preview indexing | Until no longer useful; revisions retained |
| Personal | Subscriber email, consent, delivery/bounce/complaint state | Buttondown provider; no local DB at launch | DPA review, provider access controls, export/deletion procedure | Provider policy; review annually |
| Confidential | API keys, webhook secrets, deployment tokens | GitHub environments/secrets, secret manager if added | MFA, rotation, masking, never build output | Until rotated/revoked |
| Restricted source | Licensed datasets, private research, paid material | Access-controlled editorial workspace | License check, no LLM upload without authorization | Per license and editorial need |
| Telemetry | Redacted traces, build IDs, metrics, bounded events | OTel backend / Cloudflare analytics | No PII/prompts, retention and access review | 90 days detailed; aggregates 24 months |

Raw subscriber addresses, IP addresses, full user agents, free-form search queries, prompts, and hidden model reasoning are prohibited from the public repository and default Runtime Signals event payloads.
