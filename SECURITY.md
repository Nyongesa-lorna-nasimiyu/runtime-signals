# Security policy

## Supported version

Runtime Signals is a static publication rather than a versioned package. Security fixes are made on
the default branch and applied to the current public deployment. Old commits, local forks, and
unmaintained deployments are not supported.

## Report a vulnerability

Do not open a public issue or pull request for an undisclosed vulnerability.

Use [GitHub private vulnerability
reporting](https://github.com/Nyongesa-lorna-nasimiyu/runtime-signals/security/advisories/new). If
that form is unavailable, email
[security@runtimesignals.tech](mailto:security@runtimesignals.tech) with `[SECURITY]` at the start
of the subject.

Include:

- the affected URL, file, workflow, or commit;
- the conditions needed to reproduce the problem;
- the likely impact;
- a minimal proof of concept, if one is safe to share; and
- whether you plan to disclose the issue elsewhere.

Remove credentials, personal data, and unrelated production data from the report. Do not retain or
share data obtained while testing.

## What to expect

The maintainer will try to acknowledge the report within three business days. After triage, you
will receive an assessment of scope and next steps. Updates are normally provided at least every
seven days while a confirmed issue remains open. Resolution time depends on severity and on any
upstream dependency involved.

Please allow time for a fix and coordinated disclosure. The project will credit reporters who want
public credit unless legal, privacy, or safety constraints prevent it.

## Scope

Useful reports include vulnerabilities in:

- the public site and its generated assets;
- build, preview, publication, and scheduled-publishing workflows;
- content validation or publication controls that could expose restricted content;
- dependency or supply-chain configuration; and
- repository scripts that handle credentials or trusted GitHub state.

Factual errors, broken links, and ordinary rendering bugs are not security vulnerabilities. Use the
appropriate public issue form for those reports.

## Testing boundaries

Act in good faith and avoid disrupting the service or other people. Do not use social engineering,
denial of service, automated traffic that creates material cost, or access to data beyond what is
needed to demonstrate the issue. Stop testing and report immediately if you encounter personal,
subscriber, or unpublished editorial data.
