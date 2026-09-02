#!/usr/bin/env node
// Supply-chain guard: every third-party GitHub Action must be pinned to an
// immutable commit SHA. Dependabot can then propose reviewable SHA updates,
// while a tag or branch cannot silently move underneath a production run.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WORKFLOW_DIR = '.github/workflows';
const SHA = /^[0-9a-f]{40}$/i;
const failures = [];
let actionCount = 0;

for (const file of readdirSync(WORKFLOW_DIR).filter((name) => /\.(yaml|yml)$/.test(name))) {
  const path = join(WORKFLOW_DIR, file);
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, index) => {
    const match = line.match(/^\s*uses:\s*([^\s#]+)\s*(?:#.*)?$/);
    if (!match) return;

    const reference = match[1];
    actionCount += 1;
    if (reference.startsWith('./')) {
      failures.push(
        `${path}:${index + 1}: local actions must be reviewed separately (${reference})`,
      );
      return;
    }

    const at = reference.lastIndexOf('@');
    const sha = at === -1 ? '' : reference.slice(at + 1);
    if (!SHA.test(sha)) {
      failures.push(
        `${path}:${index + 1}: ${reference} is not pinned to a 40-character commit SHA`,
      );
    }
  });
}

if (actionCount === 0) {
  failures.push(`No GitHub Actions were found under ${WORKFLOW_DIR}/`);
}

if (failures.length > 0) {
  console.error(`GitHub Action pin verification FAILED (${failures.length} issue(s)):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Verified ${actionCount} GitHub Action reference(s) are pinned to full commit SHAs.`);
