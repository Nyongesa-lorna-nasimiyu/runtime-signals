# Dependency map

Date: 2026-08-28

| Dependency | Purpose | Required for reading? | Data held | Failure fallback | Exit path |
| --- | --- | ---: | --- | --- | --- |
| Astro | Static rendering and content build | No at runtime | Repository content during build | Redeploy last known artifact | Astro-generated HTML remains portable |
| React | Selected islands | No | Browser state only | Plain HTML / native controls | Remove island or replace with vanilla JS |
| GitHub | Content source, review, CI | No for already deployed pages | Content, review metadata, secrets metadata | Serve last deployment; manual build | Git clone and another CI provider |
| GitHub Actions | Validation, scheduled builds | No | Logs and artifacts | Manual workflow dispatch | Any CI runner |
| Pagefind | Local lexical search | No | Generated public index | Search link/fallback browse pages | Rebuild with another static index |
| Cloudflare Workers Static Assets | Public delivery | Yes for live site | Deployed artifacts, request telemetry if enabled | Provider incident process / previous artifact | Any static host or object storage/CDN |
| Buttondown candidate | Double-opt-in newsletter and delivery | No | Subscriber and delivery records | Form disabled gracefully; provider export | CSV + provider adapter to Resend/another service |
| Cloudflare Web Analytics | Privacy-preserving RUM baseline | No | Aggregated web metrics | No analytics; reading unaffected | Plausible, Umami, or none |
| Search Console / Bing | Search performance | No | Search query/page aggregates in consoles | Manual review / delayed data | Other webmaster tooling |
| OpenTelemetry backend | Operations telemetry | No | Redacted traces/metrics/logs | Local build logs and provider dashboards | Any OTLP-compatible backend |
| Langfuse candidate | AI editorial trace analysis | No | AI trace metadata and outputs if enabled | Manual editorial work | Any OTLP/AI observability backend |

No dependency is permitted to become a hidden runtime requirement for article HTML.
