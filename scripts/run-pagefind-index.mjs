#!/usr/bin/env node
// Pagefind is the postbuild search-index boundary. Keeping the CLI invocation
// here lets us trace the real binary without modifying Pagefind itself.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { getCommitSha, withSpan } from './lib/otel.mjs';

function runPagefind() {
  return new Promise((resolvePromise, rejectPromise) => {
    const command = resolve(
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'pagefind.cmd' : 'pagefind',
    );
    const child = spawn(command, ['--site', 'dist', '--output-subdir', 'pagefind'], {
      stdio: 'inherit',
    });

    child.once('error', rejectPromise);
    child.once('close', (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`Pagefind exited with code ${code ?? 'unknown'}`));
    });
  });
}

await withSpan(
  'build.pagefind_index',
  {
    'vcs.commit.sha': getCommitSha(),
    'search.indexer': 'pagefind',
  },
  async (span) => {
    await runPagefind();
    span.setAttribute('search.index_path', 'dist/pagefind');
  },
);
