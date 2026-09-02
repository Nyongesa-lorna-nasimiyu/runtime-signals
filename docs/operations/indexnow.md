# IndexNow operations

Date: 2026-09-01

## Boundary

IndexNow notification is a post-deployment operation. A successful Astro build
does not prove that the corresponding HTML is serving from
`https://runtimesignals.tech`, so pull-request builds and dry-run Wrangler
invocations must never submit URLs.

The implementation contract lives in
[`scripts/ci/notify-indexnow.mjs`](../../scripts/ci/notify-indexnow.mjs). It
selects changed article and brief routes from the Git diff, excludes routes that
are not present in the current public build, includes deleted or renamed old
routes so the crawler can revisit them, and submits at most 10,000 URLs per
request. The public key file is validated against its filename before a request
is sent.

## Activation sequence

The production workflow may call the notifier only after all of these steps
have succeeded:

1. The production GitHub Environment has required reviewers configured.
2. The authoritative Cloudflare deployment runs without `--dry-run`.
3. The deployed artifact is the exact artifact that passed the build and
   publication gates.
4. The notifier receives the deployment commit range and the built `dist/`.
5. IndexNow returns `200` or `202` for every batch.

The production workflow now executes step 2 through authenticated Wrangler
after the protected environment approval and invokes this notifier immediately
afterward. Push-triggered deploys diff `github.event.before` against
`github.sha`; the deployment checkout keeps full history so the prior SHA is
available. A manually dispatched or scheduled deployment sets
`INDEXNOW_FORCE_ALL=true` and submits every currently public route, because
there may be no new content commit to diff.

The notifier is deliberately `continue-on-error`: a transient IndexNow failure
is recorded in the Actions log but does not roll back a deployment that already
succeeded. A rerun can retry the submission after checking the key, host, and
provider response.

Scheduled rebuilds have no content commit diff because the same commit becomes
live when its `published_at` passes. A scheduled deployment should therefore
use the notifier's explicit all-public mode after the successful deployment,
with the resulting submission count recorded in the workflow log. This is
idempotent: submitting an already-known URL asks for recrawl and does not
create a second publication.

## Failure handling

- `429` and transient `5xx` responses retry with bounded exponential backoff.
- Permanent `4xx` responses fail the notification step and preserve the error
  in the Actions log; they do not roll back the already-successful deployment.
- A failed notification can be retried by rerunning the deployment workflow
  after checking the key, host, and provider response.
- No URL list, key value, subscriber data, or query data is sent from pull
  requests.
- The key is intentionally public because IndexNow requires the matching key
  file to be hosted at the site; it is not a replacement for a deployment
  secret.

## Verification

Local selection and submission behavior is covered by
[`tests/unit/indexnow.test.ts`](../../tests/unit/indexnow.test.ts). Tests use a
temporary build directory and mocked HTTP responses; they never contact
IndexNow and never use subscriber or production data.
