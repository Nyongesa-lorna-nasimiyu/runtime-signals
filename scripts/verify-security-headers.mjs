#!/usr/bin/env node
// Starts a real `wrangler dev` process (the only local tool that actually
// emulates Cloudflare Workers Static Assets' _headers processing - `astro
// preview` does not) against the real dist/ build, fetches live responses, and
// asserts the headers in public/_headers actually reach the client. Not a
// config-shape check: a real request/response round trip. Also guards a real
// regression that was easy to miss: a Cache-Control set inside an Astro static
// endpoint's Response object (e.g. src/pages/og/[...slug].png.ts) is discarded
// once Cloudflare serves the resulting static file - only public/_headers
// actually reaches production, confirmed by hitting a real response and
// finding the endpoint's header simply wasn't there.
import { spawn } from 'node:child_process';

const PORT = 8799;

const CHECKS = [
  {
    path: '/',
    headers: {
      'content-security-policy': /frame-ancestors 'self'/,
      'x-frame-options': /SAMEORIGIN/,
      'x-content-type-options': /nosniff/,
      'referrer-policy': /strict-origin-when-cross-origin/,
      'permissions-policy': /camera=\(\)/,
      'cross-origin-opener-policy': /same-origin-allow-popups/,
      'strict-transport-security': /max-age=\d+/,
    },
  },
  {
    // Coupled to this fixture's real slug; update if it's ever renamed.
    path: '/og/articles/model-handoff-as-distributed-state-transfer.png',
    headers: { 'cache-control': /immutable/ },
  },
  {
    path: '/og-default.png',
    headers: { 'cache-control': /must-revalidate/ },
  },
];

// detached: true puts wrangler in its own process group so the cleanup below
// can signal the whole group, not just this one process. wrangler dev spawns
// its own esbuild and workerd child processes; killing only the immediate
// child leaves those running, which (a) keeps this script's stdout pipe open
// so Node never sees it close and the process hangs forever, observed as an
// 8-minute-plus stall in the real deploy.yml run that only ended when
// GitHub's own job cleanup force-killed the orphaned esbuild/workerd
// processes, and (b) leaks a process holding PORT locally.
const wrangler = spawn('npx', ['wrangler', 'dev', '--port', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
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
  const failures = [];
  let totalChecked = 0;

  for (const check of CHECKS) {
    const res = await fetch(`http://localhost:${PORT}${check.path}`);
    for (const [header, pattern] of Object.entries(check.headers)) {
      totalChecked += 1;
      const value = res.headers.get(header);
      if (!value || !pattern.test(value)) {
        failures.push(`${check.path} ${header}: expected to match ${pattern}, got "${value}"`);
      }
    }
  }

  if (failures.length > 0) {
    console.error('Header verification FAILED:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log(
      `All ${totalChecked} headers across ${CHECKS.length} real routes verified on a real wrangler dev response.`,
    );
  }
} finally {
  // Signal the whole process group (negative pid), not just wrangler's own
  // process, so esbuild/workerd grandchildren actually die too. Falls back to
  // killing just the direct child if the group signal itself errors (e.g.
  // wrangler already exited on its own).
  try {
    process.kill(-wrangler.pid, 'SIGTERM');
  } catch {
    wrangler.kill();
  }
  // Force exit rather than letting the event loop drain naturally: even a
  // correctly-signaled process group takes a moment to actually die, and
  // this script's own work is already done by this point.
  process.exit(process.exitCode ?? 0);
}
