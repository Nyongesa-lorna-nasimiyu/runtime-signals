# System context

Date: 2026-08-28  
Status: proposed

```mermaid
flowchart LR
  Reader[Reader] --> Web[Runtime Signals Astro site]
  Web --> Assets[Cloudflare Workers Static Assets]
  Web -. optional .-> Search[Pagefind browser index]
  Web -. future .-> Newsletter[Buttondown]
  Web -. future .-> Analytics[Cloudflare Web Analytics]
  Web -. links .-> GitHub[GitHub artifacts]
  Author[Author / reviewer] --> Repo[Git repository]
  Repo --> CI[GitHub Actions]
  CI --> Build[Astro build + validation]
  Build --> SearchBuild[Pagefind index]
  Build --> Deploy[Cloudflare deployment]
  CI --> Issues[GitHub Issues / Project]
  Scheduler[GitHub scheduled workflow] --> Issues
  Sources[arXiv, standards, repos, engineering reports] --> Ingest[Source discovery]
  Ingest --> Scheduler
  CI -. runtime/build telemetry .-> OTel[OpenTelemetry backend]
  AI[Optional editorial AI] -. correlated AI spans .-> Langfuse[Langfuse, optional]
  SearchConsole[Google Search Console] -. search performance .-> Operator[Editor]
  Bing[Bing Webmaster / IndexNow evaluation] -. search performance .-> Operator
```

## Trust zones

1. **Public zone**: generated HTML, images, feeds, sitemap, and static search assets.
2. **Repository zone**: source Markdown/MDX, citations, private issue discussions, review history.
3. **Automation zone**: GitHub Actions tokens, deployment credentials, scheduled jobs, provider secrets.
4. **Provider zone**: Buttondown subscriber and delivery data; Cloudflare analytics; search-engine consoles.
5. **Operator zone**: reviewer accounts, environment approvals, exports, incident response.

The public zone must never trust content just because it arrived from the repository. CI validates it, and untrusted fetched content remains data rather than executable markup.
