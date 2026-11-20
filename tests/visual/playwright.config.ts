import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../../dist', import.meta.url));

// Separate from tests/a11y/playwright.config.ts (different concerns: fixed
// viewports and deterministic rendering matter here, a11y/CSP semantics don't)
// but the same server-hardening lesson applies - see that config's comment
// for why `astro preview` can't be used and reuseExistingServer must be false.
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  // {projectName} is required: without it, desktop-light/desktop-dark/mobile-light
  // all write the SAME route's screenshot to the same filename, silently
  // overwriting each other's baseline - a real bug caught only by noticing all
  // three projects reported "writing actual" for the same path on first
  // generation, not by the config looking wrong on its own.
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      // 0.01 (1%) was tried first and proven wrong, not assumed adequate: a
      // real accent-color regression test (blue -> pink, every link/trace/
      // current-nav-indicator on the page) passed cleanly at that threshold,
      // because those elements cover well under 1% of a full-page screenshot
      // on most routes. maxDiffPixels is a belt-and-suspenders absolute cap -
      // real font-antialiasing noise between runs is single/low-double-digit
      // pixels, so 100 stays well above noise while still catching a small
      // real change that maxDiffPixelRatio alone might miss on a short page.
      maxDiffPixelRatio: 0.001,
      maxDiffPixels: 100,
      animations: 'disabled',
    },
  },
  webServer: {
    command: `npx serve "${distDir}" -p 4318 -L`,
    url: 'http://localhost:4318',
    reuseExistingServer: false,
    timeout: 30_000,
  },
  use: {
    baseURL: 'http://localhost:4318',
  },
  projects: [
    {
      name: 'desktop-light',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
        colorScheme: 'light',
      },
    },
    {
      name: 'desktop-dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
        colorScheme: 'dark',
      },
    },
    {
      name: 'mobile-light',
      use: { ...devices['Pixel 7'], colorScheme: 'light' },
    },
  ],
});
