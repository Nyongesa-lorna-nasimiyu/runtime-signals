# Abuse cases and controls

Date: 2026-08-28

| Abuse case | Control at launch | Evidence to test |
| --- | --- | --- |
| Repeated signup bombing | Provider double opt-in; generic response; edge rate limit by IP and normalized address; add Turnstile after threshold evidence | 429 behavior, no enumeration, no duplicate sends |
| Email enumeration | Same response for new, existing, and malformed-but-valid-shaped requests | Response body/timing comparison |
| Webhook replay | Verify HMAC over raw body; dedupe provider event ID/digest; reject stale timestamp if available | Replay returns no side effect |
| Unsubscribe abuse | Provider-owned unsubscribe; no custom unsubscribe mutation without authenticated token | Suppression remains authoritative |
| API key exposure | Protected environment only, masked logs, rotation | Secret scan and fixture logs |
| Search query injection | Query length/character cap; no HTML interpolation; no raw query logging | Fuzz and XSS fixtures |
| Index poisoning | Only merged CI artifacts; schema/status/URL validation | Draft/private fixture never appears |
| Malicious source instructions | Delimit source text and prohibit tool execution based on it | Prompt-injection fixture and reviewer flag |
| Subscriber export theft | Manual two-person approval; encrypted transfer; access log; delete local copy | Export checklist and access review |
| Bulk send mistake | Human approval, dry-run audience count, suppression check, provider send confirmation | Test campaign in sandbox |

Suggested initial limits are conservative and configurable: 5 signup attempts per IP per 15 minutes, 3 per normalized address per 24 hours, 64 KiB maximum request body, 256-character email field, 5 MiB maximum search query/index response handling, and 10 search-result cards rendered initially. These are engineering starting points, not provider guarantees.
