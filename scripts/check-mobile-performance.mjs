#!/usr/bin/env node
// Low-powered-mobile performance check against the real preview server (must
// already be running: `npm run preview`). Emulates a mid/low-tier Android profile:
// 4x CPU slowdown and a throttled ("Slow 4G"-ish) network via CDP, matching the
// performance budgets in docs/architecture/overview.md.
import { chromium, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4321';
const routes = ['/', '/articles/model-handoff-as-distributed-state-transfer', '/search'];

const browser = await chromium.launch();
const results = [];

for (const route of routes) {
  const context = await browser.newContext({ ...devices['Moto G4'] });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (1.6 * 1024 * 1024) / 8, // ~1.6 Mbps, "Slow 4G"-ish
    uploadThroughput: (750 * 1024) / 8,
    latency: 150,
  });
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const responses = [];
  page.on('response', (res) => {
    responses.push(res);
  });

  const start = Date.now();
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 30_000 });
  const loadMs = Date.now() - start;

  let transferBytes = 0;
  const byType = {};
  for (const res of responses) {
    try {
      const buf = await res.body();
      transferBytes += buf.byteLength;
      const url = new URL(res.url());
      const ext = url.pathname.split('.').pop() ?? 'other';
      byType[ext] = (byType[ext] ?? 0) + buf.byteLength;
    } catch {
      // navigation-aborted or redirect responses have no body; skip
    }
  }

  const requiredScriptSrcs = await page.$$eval('script[src]', (nodes) =>
    nodes.map((n) => n.getAttribute('src')),
  );

  results.push({
    route,
    loadMs,
    requestCount: responses.length,
    transferBytes,
    byType,
    requiredScriptSrcs,
  });
  await context.close();
}

await browser.close();

console.log(
  JSON.stringify({ profile: 'Moto G4, 4x CPU throttle, ~1.6Mbps/150ms network', results }, null, 2),
);
