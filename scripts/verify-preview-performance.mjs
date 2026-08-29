#!/usr/bin/env node
// Real Lighthouse performance audits against the actual dist/ build, served
// statically - not a config-shape or bundle-size proxy. Only asserts on the
// performance category: accessibility is already covered for real by
// tests/a11y's axe-core suite, and mixing a second, differently-tuned
// accessibility signal in here would just create confusing disagreements
// between two tools measuring the same thing differently.
//
// Learned from scripts/verify-security-headers.mjs's real CI hang (a wrangler
// dev process whose esbuild/workerd children outlived a plain .kill()): both
// the static server and Chrome are spawned detached and killed by process
// group, not just by their own pid.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const PORT = 8798;
const DIST_URL = `http://localhost:${PORT}`;
// Two representative routes, not every page: the homepage (the heaviest
// listing page - cards, images) and one real article (the heaviest single
// content type - long-form body, code blocks, JSON-LD, an OG image
// reference). Coupled to this fixture's real slug; update if it's renamed.
const ROUTES = ['/', '/articles/model-handoff-as-distributed-state-transfer/'];
// 0.85, not the stricter 0.9+ some setups use: this is the first real
// performance gate in the project (no prior budget existed to calibrate
// against), and 0.85 already fails a genuine regression while leaving room
// to tighten once a real baseline of scores across routes exists.
const MIN_PERFORMANCE_SCORE = 0.85;
// Lighthouse's default mobile profile simulates a slow CPU/network via a
// throttling *multiplier* applied to real measured timing - which means any
// CI-runner CPU contention gets amplified, not just added. Confirmed for
// real: PR #6 scored a perfect 1.0 on both routes; an unrelated docs-only PR
// (#8) scored 0.78 on the homepage minutes later, on the same code. Using
// `throttlingMethod: 'provided'` (measure actual observed timing, no
// simulated slowdown) instead of the default `simulate` removes that
// amplification - appropriate here since this is a small static site being
// measured for real regressions, not modeled against an average mobile
// user's real-world network.
const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    throttlingMethod: 'provided',
    formFactor: 'desktop',
    screenEmulation: { disabled: true },
  },
};
const auditPath = process.env.PREVIEW_PERF_AUDIT_PATH ?? 'preview-performance.json';

// docs/adr/0003-analytics-platform.md's Phase-1 research cites these as the
// site's Core Web Vitals targets (web.dev, 75th-percentile real-user
// measurement). This check is a synthetic/lab budget, not a literal
// enforcement of that RUM percentile - a single Lighthouse run is one
// measurement, not a distribution - but the same numeric thresholds are the
// right budget to hold a lab run to: if a single unthrottled lab run can't
// clear the number real users are supposed to hit at their 75th percentile,
// that's a real regression worth catching before it ships. INP itself has no
// lab equivalent (it requires a real user interaction to measure); Total
// Blocking Time is the standard Lighthouse lab proxy for input
// responsiveness, so it's checked against the same 200ms budget as INP.
const CWV_BUDGETS = {
  lcpMs: 2500,
  clsScore: 0.1,
  tbtMs: 200,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await sleep(300);
  }
  throw new Error(`Static server at ${url} did not become ready in time`);
}

const server = spawn('npx', ['serve', 'dist', '-p', String(PORT), '-L'], {
  stdio: 'ignore',
  detached: true,
});

let chrome;
try {
  await waitForServer(DIST_URL);
  chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });

  const results = [];
  for (const route of ROUTES) {
    const url = `${DIST_URL}${route}`;
    const runnerResult = await lighthouse(
      url,
      { port: chrome.port, output: 'json', onlyCategories: ['performance'], logLevel: 'error' },
      LIGHTHOUSE_CONFIG,
    );
    const { audits, categories } = runnerResult.lhr;
    results.push({
      route,
      score: categories.performance.score,
      lcpMs: audits['largest-contentful-paint'].numericValue,
      clsScore: audits['cumulative-layout-shift'].numericValue,
      tbtMs: audits['total-blocking-time'].numericValue,
    });
  }

  writeFileSync(
    auditPath,
    `${JSON.stringify({ minRequired: MIN_PERFORMANCE_SCORE, budgets: CWV_BUDGETS, results }, null, 2)}\n`,
  );

  const failures = [];
  for (const r of results) {
    if (r.score === null || r.score < MIN_PERFORMANCE_SCORE) {
      failures.push(`${r.route}: performance score ${r.score} (minimum ${MIN_PERFORMANCE_SCORE})`);
    }
    if (r.lcpMs > CWV_BUDGETS.lcpMs) {
      failures.push(`${r.route}: LCP ${r.lcpMs.toFixed(0)}ms (budget ${CWV_BUDGETS.lcpMs}ms)`);
    }
    if (r.clsScore > CWV_BUDGETS.clsScore) {
      failures.push(`${r.route}: CLS ${r.clsScore.toFixed(3)} (budget ${CWV_BUDGETS.clsScore})`);
    }
    if (r.tbtMs > CWV_BUDGETS.tbtMs) {
      failures.push(
        `${r.route}: TBT ${r.tbtMs.toFixed(0)}ms (budget ${CWV_BUDGETS.tbtMs}ms, INP proxy)`,
      );
    }
  }

  if (failures.length > 0) {
    console.error('Performance verification FAILED:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  } else {
    for (const r of results) {
      console.log(
        `${r.route}: score ${r.score}, LCP ${r.lcpMs.toFixed(0)}ms, CLS ${r.clsScore.toFixed(3)}, TBT ${r.tbtMs.toFixed(0)}ms`,
      );
    }
  }
} finally {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill();
  }
  chrome?.kill();
  process.exit(process.exitCode ?? 0);
}
