import { execFileSync } from 'node:child_process';

/**
 * The commit SHA that last touched a content file, read from git history — never
 * from frontmatter. This is the value src/lib/approval.ts cross-checks against the
 * approval manifest, so authorization is tied to what was actually reviewed, not to
 * anything the file itself claims. In real CI this is the merge commit; locally it's
 * whatever git reports for the file's last change (including "uncommitted").
 */
export function commitShaForFile(filePath: string): string {
  try {
    const sha = execFileSync('git', ['log', '-1', '--format=%H', '--', filePath], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return sha || 'uncommitted';
  } catch {
    return 'uncommitted';
  }
}
