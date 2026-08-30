---
title: 'Weekly Brief: A lease without fencing is only a timeout'
dek: Check whether expired workers can still commit after a replacement has taken ownership.
status: draft
authors: [jordan-avery]
topics: [reliability, execution]
published_at: 2026-10-23T07:00:00Z
reading_time_minutes: 3
claims:
  - id: claim.brief.fencing
    text: A worker lease does not stop stale requests unless the receiver validates an owner or fencing token.
    evidence: inference
    sources: [aws-idempotent-apis]
citations: [aws-idempotent-apis]
---

Draft brief for the reliability cluster. A lease answers who should work now; it does not
necessarily stop a delayed request from the previous owner. AWS's [idempotent API guidance](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
covers duplicate and late requests. Apply the same scrutiny to the owner token: the receiver must
reject an older token, not just the worker.

Action: pause worker A, let its lease expire, let worker B commit, then release A and assert that A
cannot overwrite the result.
