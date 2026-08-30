---
title: 'Weekly Brief: Retrieval is a security boundary'
dek: A short review for detecting when retrieved content can steer tools instead of informing a decision.
status: scheduled
authors: [jordan-avery]
topics: [security, execution]
published_at: 2026-10-16T07:00:00Z
reading_time_minutes: 3
claims:
  - id: claim.brief.indirect-injection
    text: Retrieved content can carry indirect prompt injection that changes an agent's behavior.
    evidence: supported
    sources: [owasp-prompt-injection]
citations: [owasp-prompt-injection]
---

Draft brief for the security cluster. Treat retrieved text as tainted data. Review whether the
agent can turn a document's words into a new target, capability, or approval without a trusted
policy check. OWASP's [LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
documents the direct and indirect forms of this risk.

Action: plant a harmless instruction in a test document, assert that the model may quote it but
the tool runner rejects any unauthorized target or capability change.
