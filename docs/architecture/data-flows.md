# Data flows

Date: 2026-08-28

## Publication build

```mermaid
sequenceDiagram
  participant PR as Pull request
  participant CI as GitHub Actions
  participant V as Validators
  participant A as Astro
  participant P as Pagefind
  participant CF as Cloudflare Workers
  PR->>CI: push / review
  CI->>V: schema, links, citations, MDX policy, a11y, performance
  V-->>CI: pass or block
  CI->>A: build approved content
  A->>P: index generated HTML
  P-->>CI: static search assets
  CI->>CF: deploy immutable artifact
  CF-->>PR: deployment URL / status
```

## Subscription (future)

```mermaid
sequenceDiagram
  participant R as Reader
  participant W as Worker form route
  participant B as Buttondown
  participant E as Email confirmation
  R->>W: email + consent + abuse token
  W->>B: idempotent create subscriber
  B-->>W: unactivated / duplicate response
  W-->>R: generic confirmation message
  B->>E: double-opt-in email
  E->>B: confirmation click
  B-->>W: signed subscriber.confirmed webhook
  W->>W: verify signature, dedupe event, audit outcome
```

## Provider webhook handling

```mermaid
flowchart TD
  Event[Webhook request] --> TLS[TLS + route check]
  TLS --> Sig[Verify HMAC over raw body]
  Sig -->|fail| Reject[401; no side effects]
  Sig -->|pass| Idem[Check provider event id / digest]
  Idem -->|seen| Ack[200; no-op]
  Idem -->|new| Validate[Schema + event type validation]
  Validate --> Queue[Persist minimal event / enqueue bounded work]
  Queue --> Ack
  Queue --> Reconcile[Periodic provider reconciliation]
```

At launch, the Worker webhook route is deferred. If implemented, it must acknowledge only after durable deduplication state exists, or deliberately use an at-least-once provider projection with reconciliation.

## Search indexing

```mermaid
flowchart LR
  MD[Approved Markdown/MDX] --> Astro[Astro generated HTML]
  Astro --> Fields[Title, summary, body, topic, series, author, date, status]
  Astro --> Pagefind[Pagefind post-build index]
  Pagefind --> Chunks[Lazy static chunks]
  Chunks --> Browser[Search island]
  Drafts[Draft / preview] -. excluded .-> Pagefind
```

## Two state machines: editorial_state and publication_state

`approved` is not a state in either machine — see `docs/architecture/content-model.md` ("Two state machines"). `editorial_state` tracks research/review readiness; `publication_state` tracks what the site serves. The only bridge between them is the approval manifest, which is neither state: it is CI evidence (protected-branch review, required checks, CODEOWNERS, deployment-environment authorization) for one exact commit.

```mermaid
stateDiagram-v2
  state "editorial_state (GitHub issue/PR/project)" as ES {
    [*] --> idea
    idea --> researching
    researching --> source_verified
    source_verified --> outlined
    outlined --> drafting
    drafting --> technical_review
    technical_review --> editorial_review
    editorial_review --> editorial_complete
    technical_review --> drafting: material defect
    editorial_review --> drafting: quality / evidence gap
    editorial_complete --> monitoring: publication_state reaches published
    monitoring --> update_required
    update_required --> revised
    revised --> technical_review
  }
  state "publication_state (frontmatter status)" as PS {
    [*] --> draft
    draft --> scheduled
    scheduled --> published: approval manifest authorizes this commit
    published --> archived
  }
  ES --> PS: editorial_complete AND approval manifest match unlock published
```

## Scheduled publication

```mermaid
sequenceDiagram
  participant G as GitHub cron (UTC)
  participant C as Checkout main
  participant V as Publication gate
  participant B as Astro build
  participant D as Cloudflare
  G->>C: 04:05 UTC daily (07:05 EAT target)
  C->>V: evaluate status + published_at <= now
  V-->>G: fail and alert if invalid
  C->>B: build visible snapshot
  B->>D: deploy if artifact changed
  D-->>G: deployment result
  G->>G: retry safely; artifact snapshot is idempotent
```

## Telemetry separation

```mermaid
flowchart LR
  Site[Worker / build / search / forms] --> OTel[OpenTelemetry spans + metrics]
  OTel --> OTelBackend[Vendor-neutral backend]
  EditorialAI[LLM-assisted editorial call] --> AIOTel[AI-specific span attributes]
  AIOTel --> Langfuse[Langfuse optional]
  AIOTel -. trace_id correlation .-> OTel
  Provider[Provider token/cache usage] --> Billing[Provider billing record]
  Billing -. authoritative cost .-> Editor[Editor]
  Search[Search Console/Bing] --> SEO[Search-performance review]
  Audience[Cloudflare Web Analytics] --> AudienceReview[Audience review]
```

## Failure and retry paths

```mermaid
flowchart TD
  Request[Request] --> External[External dependency]
  External -->|success| Response[Return success]
  External -->|timeout / 5xx| Classify{Idempotent?}
  Classify -->|no| Fail[Fail safely; no blind retry]
  Classify -->|yes| Backoff[Bounded exponential backoff]
  Backoff --> Attempts{Attempts remain?}
  Attempts -->|yes| External
  Attempts -->|no| Fallback[Fallback / queue / alert]
  Fallback --> Reconcile[Reconcile from authoritative source]
  Response --> Readable[Reading remains available]
  Fail --> Readable
  Reconcile --> Readable
```
