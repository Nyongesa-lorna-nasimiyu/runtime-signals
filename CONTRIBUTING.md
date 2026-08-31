# Contributing to Runtime Signals

Runtime Signals accepts focused improvements to the site, its tooling, and its documentation.
Editorial corrections are welcome. New long-form articles require prior agreement with a
maintainer because publication includes source review, rights checks, and a separate approval
process.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Choose the right channel

- Report a reproducible site or tooling problem with the bug report form.
- Propose a bounded improvement with the feature request form.
- Report a factual error with the editorial correction form.
- Report security vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
- Email conduct concerns to [care@runtimesignals.tech](mailto:care@runtimesignals.tech).

Search existing issues before opening a new one. Do not put credentials, personal data,
unpublished research, or exploit details in a public issue.

## Local setup

The repository requires Node.js 22.12 or newer and npm.

Fork the repository, then clone your fork:

```bash
git clone https://github.com/YOUR-USERNAME/runtime-signals.git
cd runtime-signals
npm ci
npm run dev
```

The development server prints its local URL. Production output is static and is generated in
`dist/`.

## Make a change

1. Create a branch from the latest `main`.
2. Keep the change narrow. Avoid unrelated refactors, formatting, or dependency upgrades.
3. Follow the existing Astro, TypeScript, CSS, test, and documentation conventions.
4. Add regression coverage for a bug fix.
5. Run the checks that apply to the change.
6. Complete the pull request template and explain any check you could not run.

Do not commit generated build output, local environment files, credentials, or test artifacts.
External contributors do not need to sign commits, but every change must go through a reviewed
pull request.

## Verification

Run focused checks first. Before requesting review, run the repository gates that apply:

```bash
npm run lint
npm run format:check
npm run verify:docs
npm test
npm run build
npm run verify:mdx
```

For browser-facing changes, also run:

```bash
npm run test:a11y
npm run test:visual
```

Visual snapshots may be updated only for an intentional, reviewed visual change. Inspect every
changed image before including it in a pull request.

The required `publication-gate` workflow runs the core checks again. Passing CI does not authorize
content to publish. Publication also requires CODEOWNERS review and the protected deployment
approval described in [the publication gates](docs/editorial/publication-gates.md).

## Editorial changes

For corrections, identify the page, the disputed claim, and the strongest available primary
source. A correction keeps the existing URL and receives a visible revision record when accepted.

Before proposing a new article or brief, open an issue and agree on the scope with a maintainer.
Accepted editorial work must follow:

- [the source and citation policy](docs/editorial/source-policy.md);
- [the editorial workflow](docs/editorial/workflow.md);
- [the editorial automation policy](docs/editorial/automation-policy.md); and
- the schemas in [`src/content.config.ts`](src/content.config.ts).

Do not submit text or media that you do not have the right to contribute. AI-assisted research or
drafting must be disclosed in the pull request, reviewed by a person, and checked against the cited
sources. Generated output cannot satisfy editorial review or authorize publication.

## Pull request review

Maintainers review correctness, scope, tests, accessibility, security, and compatibility with the
publication model. Content changes also receive source, rights, and editorial review. A maintainer
may ask for a smaller patch or decline work that does not fit the publication.

Reviews should discuss the patch, not the contributor. If you disagree with feedback, explain the
tradeoff and provide evidence. The maintainer responsible for the affected area makes the final
decision.

## Licensing

Unless you state otherwise, code and technical documentation intentionally submitted and accepted
through this repository are contributed under the [Apache License 2.0](LICENSE).

Original publication content under `src/content/` and Runtime Signals branding are outside that
license as described in [NOTICE](NOTICE). Do not submit new long-form editorial content until a
maintainer has confirmed the publication and rights terms in writing.
