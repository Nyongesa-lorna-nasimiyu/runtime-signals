import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  changedPublicRoutes,
  indexNowKey,
  publicRoutesFromDist,
  routesFromDiff,
  submitIndexNow,
} from '../../scripts/ci/notify-indexnow.mjs';

const temporaryDirectories: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('IndexNow route selection', () => {
  it('maps added, modified, deleted, and renamed content files to routes', () => {
    const diff = [
      'A\tsrc/content/articles/new-piece.md',
      'M\tsrc/content/briefs/brief.md',
      'D\tsrc/content/articles/removed.mdx',
      'R100\tsrc/content/articles/old-name.md\tsrc/content/articles/new-name.md',
      'M\tsrc/content/authors/editor.yaml',
    ].join('\n');

    expect(routesFromDiff(diff)).toEqual([
      '/articles/new-name',
      '/articles/new-piece',
      '/articles/old-name',
      '/articles/removed',
      '/brief/brief',
    ]);
  });

  it('excludes noindex and 404 output from the current public set', () => {
    const dist = mkdtempSync(join(tmpdir(), 'runtime-signals-dist-'));
    temporaryDirectories.push(dist);
    mkdirSync(join(dist, 'articles', 'live'), { recursive: true });
    mkdirSync(join(dist, 'articles', 'archived'), { recursive: true });
    writeFileSync(join(dist, 'articles', 'live', 'index.html'), '<h1>Live</h1>');
    writeFileSync(
      join(dist, 'articles', 'archived', 'index.html'),
      '<meta name="robots" content="noindex">',
    );
    writeFileSync(join(dist, '404.html'), '<h1>Not found</h1>');

    expect(publicRoutesFromDist(dist)).toEqual(['/articles/live']);
    expect(
      changedPublicRoutes({
        diff: 'M\tsrc/content/articles/live.md\nM\tsrc/content/articles/archived.md\nD\tsrc/content/articles/removed.md',
        distDir: dist,
      }),
    ).toEqual(['/articles/live', '/articles/removed']);
  });

  it('rejects mismatched public IndexNow key files', () => {
    const publicDir = mkdtempSync(join(tmpdir(), 'runtime-signals-public-'));
    temporaryDirectories.push(publicDir);
    writeFileSync(join(publicDir, '0123456789abcdef.txt'), 'different-key\n');
    expect(() => indexNowKey(publicDir)).toThrow('does not match');
  });
});

describe('IndexNow submission', () => {
  it('retries transient responses and accepts 202', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(new Response('', { status: 202 }));
    const result = await submitIndexNow(['/articles/one'], {
      fetchImpl,
      keyInfo: { key: 'key', keyLocation: 'https://runtimesignals.tech/key.txt' },
      sleep: vi.fn(),
    });

    expect(result).toEqual({ submitted: 1, requests: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const firstRequest = fetchImpl.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(firstRequest?.body))).toMatchObject({
      host: 'runtimesignals.tech',
      urlList: ['https://runtimesignals.tech/articles/one'],
    });
  });

  it('does not retry permanent client errors', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 403 }));
    await expect(
      submitIndexNow(['/articles/one'], {
        fetchImpl,
        keyInfo: { key: 'key', keyLocation: 'https://runtimesignals.tech/key.txt' },
        sleep: vi.fn(),
      }),
    ).rejects.toThrow('HTTP 403');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
