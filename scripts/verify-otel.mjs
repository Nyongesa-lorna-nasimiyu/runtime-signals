#!/usr/bin/env node
// Manual smoke check: run `npm run verify:otel` and inspect the local console
// span. No network exporter or external account is involved.
import { withSpan } from './lib/otel.mjs';

await withSpan('observability.verify', { 'verification.mode': 'local' }, async (span) => {
  span.setAttribute('verification.result', 'success');
});
