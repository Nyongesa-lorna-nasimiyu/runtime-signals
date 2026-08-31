#!/usr/bin/env node
// Notify IndexNow only after a successful production deployment. This script
// is deliberately separate from the build: a successful build does not mean
// the corresponding HTML is publicly serving yet.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, join, relative } from 'node:path';

export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
export const SITE_HOST = 'runtimesignals.tech';
export const SITE_URL = `https://${SITE_HOST}`;
export const MAX_URLS_PER_REQUEST = 10_000;

function contentRoute(path) {
  const normalized = path.replaceAll('\\', '/');
  const match = normalized.match(/^src\/content\/(articles|briefs)\/([^/]+)\.(?:md|mdx)$/);
  if (!match) return null;
  return `/${match[1] === 'articles' ? 'articles' : 'brief'}/${match[2]}`;
}

export function routesFromDiff(diff) {
  const routes = new Set();
  for (const line of diff.split('\n')) {
    if (!line.trim()) continue;
    const fields = line.split('\t');
    const status = fields[0] ?? '';
    const paths =
      status.startsWith('R') || status.startsWith('C') ? fields.slice(1) : fields.slice(1, 2);
    for (const path of paths) {
      const route = contentRoute(path);
      if (route) routes.add(route);
    }
  }
  return [...routes].sort();
}

function routesByChange(diff) {
  const current = new Set();
  const removed = new Set();
  for (const line of diff.split('\n')) {
    if (!line.trim()) continue;
    const fields = line.split('\t');
    const status = fields[0] ?? '';
    const paths =
      status.startsWith('R') || status.startsWith('C') ? fields.slice(1) : fields.slice(1, 2);
    for (const [index, path] of paths.entries()) {
      const route = contentRoute(path);
      if (!route) continue;
      if (status === 'D' || (status.startsWith('R') && index === 0)) removed.add(route);
      else current.add(route);
    }
  }
  return { current, removed };
}

function htmlFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...htmlFiles(full));
    else if (entry === 'index.html' || entry.endsWith('.html')) files.push(full);
  }
  return files;
}

function routeForDistFile(file, distDir) {
  const path = `/${relative(distDir, file).replaceAll('\\', '/')}`;
  return path.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
}

export function publicRoutesFromDist(distDir = 'dist') {
  if (!existsSync(distDir)) throw new Error(`Build directory does not exist: ${distDir}`);
  const routes = [];
  for (const file of htmlFiles(distDir)) {
    const route = routeForDistFile(file, distDir);
    if (route === '/404.html' || route === '/404') continue;
    const html = readFileSync(file, 'utf8');
    if (/<meta name="robots" content="noindex/i.test(html)) continue;
    routes.push(route);
  }
  return [...new Set(routes)].sort();
}

export function changedPublicRoutes({ diff, distDir = 'dist' }) {
  const { current: currentChanges, removed } = routesByChange(diff);
  const publicRoutes = new Set(publicRoutesFromDist(distDir));
  return [
    ...new Set([...removed, ...[...currentChanges].filter((route) => publicRoutes.has(route))]),
  ].sort();
}

export function indexNowKey(publicDir = 'public') {
  const candidates = readdirSync(publicDir)
    .filter((file) => /^[a-f0-9]{16,64}\.txt$/i.test(file))
    .sort();
  if (candidates.length !== 1) {
    throw new Error(
      `Expected exactly one IndexNow key file in ${publicDir}, found ${candidates.length}`,
    );
  }
  const file = candidates[0];
  const key = readFileSync(join(publicDir, file), 'utf8').trim();
  if (key !== basename(file, '.txt')) throw new Error(`IndexNow key does not match ${file}`);
  return { key, keyLocation: `${SITE_URL}/${file}` };
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function submitIndexNow(
  urls,
  {
    fetchImpl = fetch,
    keyInfo = indexNowKey(),
    endpoint = INDEXNOW_ENDPOINT,
    sleep = wait,
    maxAttempts = 3,
  } = {},
) {
  if (urls.length === 0) return { submitted: 0, requests: 0 };
  let requests = 0;
  for (let offset = 0; offset < urls.length; offset += MAX_URLS_PER_REQUEST) {
    const urlList = urls
      .slice(offset, offset + MAX_URLS_PER_REQUEST)
      .map((route) => `${SITE_URL}${route}`);
    let response;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      requests += 1;
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: SITE_HOST,
          key: keyInfo.key,
          keyLocation: keyInfo.keyLocation,
          urlList,
        }),
      });
      if (response.ok || response.status === 202) break;
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === maxAttempts) {
        throw new Error(`IndexNow request failed with HTTP ${response.status}`);
      }
      await sleep(2 ** (attempt - 1) * 1_000);
    }
  }
  return { submitted: urls.length, requests };
}

function gitDiff(from, to) {
  if (!from || /^0+$/.test(from)) {
    return execFileSync(
      'git',
      ['diff-tree', '--root', '--no-commit-id', '--name-status', '-r', '-M', to],
      {
        encoding: 'utf8',
      },
    );
  }
  return execFileSync(
    'git',
    ['diff', '--name-status', '-M', from, to, '--', 'src/content/articles', 'src/content/briefs'],
    {
      encoding: 'utf8',
    },
  );
}

export async function main({ env = process.env } = {}) {
  const forceAll = env.INDEXNOW_FORCE_ALL === 'true';
  const urls = forceAll
    ? publicRoutesFromDist(env.INDEXNOW_DIST_DIR ?? 'dist')
    : changedPublicRoutes({
        diff: gitDiff(env.INDEXNOW_FROM_SHA, env.INDEXNOW_TO_SHA ?? env.GITHUB_SHA ?? 'HEAD'),
        distDir: env.INDEXNOW_DIST_DIR ?? 'dist',
      });

  if (urls.length === 0) {
    console.log('IndexNow: no changed public URLs to submit.');
    return { submitted: 0, requests: 0 };
  }
  if (env.INDEXNOW_DRY_RUN === 'true') {
    console.log(`IndexNow dry run: ${urls.length} public URL(s) selected.`);
    return { submitted: 0, requests: 0, selected: urls.length };
  }
  const result = await submitIndexNow(urls);
  console.log(`IndexNow: submitted ${result.submitted} URL(s) in ${result.requests} request(s).`);
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
