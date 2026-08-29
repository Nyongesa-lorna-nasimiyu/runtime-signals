import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../../dist', import.meta.url));

// `astro preview` cannot be used here: it always self-daemonizes (prints
// "Preview server running (pid N)" and returns immediately, regardless of
// flags — verified directly, not assumed), which is incompatible with how
// Playwright's webServer expects to own a long-running foreground process it
// spawns and can reliably kill. That mismatch caused two real problems: an
// intermittent "Process from config.webServer exited early" failure, and —
// worse — when reuseExistingServer silently found *something* already
// listening on the port (once, an unrelated `astro dev` instance, apparently
// launched by the editor's Astro extension), it ran the entire a11y suite
// against a live dev server carrying the Dev Toolbar UI instead of the real
// static build, corrupting results (axe's `h1` locator matched the toolbar's
// own panel headings). `serve` is an ordinary foreground static file server
// with no daemonizing behavior, serving the actual dist/ output via an
// absolute path so it's independent of whatever cwd Playwright invokes it from.
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  webServer: {
    command: `npx serve "${distDir}" -p 4319 -L`,
    url: 'http://localhost:4319',
    // Never reuse whatever happens to already be listening on this port —
    // that ambiguity is exactly what caused the corrupted run above.
    reuseExistingServer: false,
    timeout: 30_000,
  },
  use: {
    baseURL: 'http://localhost:4319',
  },
});
