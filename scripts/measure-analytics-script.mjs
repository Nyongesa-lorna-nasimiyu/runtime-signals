#!/usr/bin/env node
// Deferred-POC completion (docs/poc/README.md): measures the real performance
// impact of the script docs/adr/0003 recommends (Cloudflare Web Analytics), without
// creating any account or embedding it. This fetches only the public, unauthenticated
// beacon script Cloudflare serves to every site using the product and reports its
// transfer size - no analytics account, token, or site ID is involved or needed.
import https from 'node:https';

const URL = 'https://static.cloudflareinsights.com/beacon.min.js';
const BUDGET_KB = 5; // "no analytics script that materially harms performance" (overview.md budget)

function fetchWithEncoding(url, acceptEncoding) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'Accept-Encoding': acceptEncoding } }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            contentEncoding: res.headers['content-encoding'] ?? 'identity',
            bytes: Buffer.concat(chunks).byteLength,
          }),
        );
      })
      .on('error', reject);
  });
}

const [plain, compressed] = await Promise.all([
  fetchWithEncoding(URL, 'identity'),
  fetchWithEncoding(URL, 'gzip, br'),
]);

const result = {
  script_url: URL,
  uncompressed_bytes: plain.bytes,
  as_served_bytes: compressed.bytes,
  as_served_encoding: compressed.contentEncoding,
  budget_kb: BUDGET_KB,
  within_budget: compressed.bytes <= BUDGET_KB * 1024,
  note: 'Fetched the public beacon script directly; no analytics account created or data sent. Does not measure main-thread/render-blocking impact - that requires a real page load trace, deferred to when ADR-0003 is actually instrumented.',
};

console.log(JSON.stringify(result, null, 2));
