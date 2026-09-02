import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readEditorialLastmodDates } from '../../scripts/lib/content-status.mjs';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function writeArticle(root: string, frontmatter: string) {
  const articles = join(root, 'articles');
  mkdirSync(articles, { recursive: true });
  writeFileSync(join(articles, 'fixture.md'), `---\n${frontmatter}\n---\n`);
}

describe('readEditorialLastmodDates', () => {
  it.each([
    [
      'published_at: 2026-06-01T07:00:00Z # original publication\nrevisions: [{ date: 2026-08-29T00:00:00Z, note: updated, type: update }]',
      '2026-08-29T00:00:00.000Z',
    ],
    ['published_at: 2026-06-01T07:00:00Z\nrevisions: []', '2026-06-01T07:00:00.000Z'],
    [
      'published_at: 2026-06-01T07:00:00Z\nrevisions:\n  - date: 2026-07-01T07:00:00Z\n    note: first\n    type: update\n  - date: 2026-09-01T07:00:00Z # latest\n    note: second\n    type: correction',
      '2026-09-01T07:00:00.000Z',
    ],
  ])('returns the latest valid editorial date for YAML form %j', (frontmatter, expected) => {
    const root = mkdtempSync(join(tmpdir(), 'runtime-signals-content-status-'));
    temporaryDirectories.push(root);
    writeArticle(root, frontmatter);

    expect(readEditorialLastmodDates(root).get('/articles/fixture')?.toISOString()).toBe(expected);
  });
});
