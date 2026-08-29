#!/usr/bin/env node
// Starts a real `wrangler dev` process (the only local tool that actually
// emulates Cloudflare Workers Static Assets' _headers processing — `astro
// preview` does not) against the real dist/ build, fetches a live response, and
// asserts the security headers in public/_headers actually reach the client.
// Not a config-shape check: a real request/response round trip.
import { spawn } from 'node:child_process';

const PORT = 8799;
const REQUIRED_HEADERS = {
  'content-security-policy': /frame-ancestors 'self'/,
  'x-frame-options': /SAMEORIGIN/,
  'x-content-type-options': /nosniff/,
  'referrer-policy': /strict-origin-when-cross-origin/,
  'permissions-policy': /camera=\(\)/,
  'cross-origin-opener-policy': /same-origin-allow-popups/,
  'strict-transport-security': /max-age=\d+/,
};

const wrangler = spawn('npx', ['wrangler', 'dev', '--port', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let ready = false;
wrangler.stdout.on('data', (chunk) => {
  if (chunk.toString().includes('Ready on')) ready = true;
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(timeoutMs = 20_000) {
  const start = Date.now();
  while (!ready) {
    if (Date.now() - start > timeoutMs)
      throw new Error('wrangler dev did not become ready in time');
    await sleep(300);
  }
  await sleep(500); // let the local server actually accept connections
}

try {
  await waitForReady();
  const res = await fetch(`http://localhost:${PORT}/`);
  const failures = [];
  for (const [header, pattern] of Object.entries(REQUIRED_HEADERS)) {
    const value = res.headers.get(header);
    if (!value || !pattern.test(value)) {
      failures.push(`${header}: expected to match ${pattern}, got "${value}"`);
    }
  }
  if (failures.length > 0) {
    console.error('Security header verification FAILED:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log(
      `All ${Object.keys(REQUIRED_HEADERS).length} security headers verified on a real wrangler dev response.`,
    );
  }
} finally {
  wrangler.kill();
}
