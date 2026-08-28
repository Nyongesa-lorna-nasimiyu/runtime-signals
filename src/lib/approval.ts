import { readFileSync, existsSync } from 'node:fs';
import { z } from 'astro/zod';
import { commitShaForFile } from './git';
import type { CollectionEntry } from 'astro:content';

/**
 * The CI-generated approval-manifest boundary (docs/editorial/publication-gates.md,
 * "Approval representation"). Authorization is never read from content frontmatter —
 * a record's own `status` only proves shape and timing (see isPubliclyLive in
 * publication.ts). This file is the only place that grants publication authority,
 * and it grants it only for the exact commit that was reviewed.
 *
 * In real CI (docs/adr/0004, "protected production environments"), this manifest is
 * generated from GitHub's actual protected-branch review state, required check-run
 * results, CODEOWNERS approval, and deployment-environment authorization — never
 * written by a content author. Locally, with no CI yet, the build reads a checked-in
 * fixture (approval-manifest.local.json) that is explicitly documented as a
 * non-authoritative stand-in; see scripts/generate-approval-manifest.mjs.
 */
const manifestEntrySchema = z.object({
  commit_sha: z.string().min(1),
  required_checks_passed: z.boolean(),
  codeowners_approved: z.boolean(),
  deployment_environment_authorized: z.boolean(),
});

const manifestSchema = z.record(z.string(), manifestEntrySchema);
export type ApprovalManifest = z.infer<typeof manifestSchema>;
export type ManifestEntry = z.infer<typeof manifestEntrySchema>;

const DEFAULT_MANIFEST_PATH = process.env.APPROVAL_MANIFEST_PATH ?? 'approval-manifest.local.json';

let cachedManifest: ApprovalManifest | null = null;

export function loadApprovalManifest(path: string = DEFAULT_MANIFEST_PATH): ApprovalManifest {
  if (cachedManifest) return cachedManifest;
  if (!existsSync(path)) {
    // Fail closed: no manifest means nothing is authorized, not everything.
    cachedManifest = {};
    return cachedManifest;
  }
  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  cachedManifest = manifestSchema.parse(raw);
  return cachedManifest;
}

export function manifestKeyFor(
  entry: Pick<CollectionEntry<'articles' | 'briefs'>, 'collection' | 'id'>,
): string {
  return `${entry.collection}/${entry.id}`;
}

/**
 * Pure authorization check, independent of git/filesystem I/O so it's directly
 * unit-testable (tests/unit/approval.test.ts). True only if the manifest has an
 * entry for this exact key, tied to the exact commit that was reviewed (so an edit
 * after approval invalidates it until the manifest is regenerated for the new
 * commit — the property docs/poc/scheduled-publish/idempotency.test.mjs proves),
 * and every trust signal is true.
 */
export function isApprovedFor(
  key: string,
  actualCommitSha: string,
  manifest: ApprovalManifest,
): boolean {
  const record = manifest[key];
  if (!record) return false;
  return (
    record.commit_sha === actualCommitSha &&
    record.required_checks_passed === true &&
    record.codeowners_approved === true &&
    record.deployment_environment_authorized === true
  );
}

/**
 * True only if the manifest authorizes this exact content record for its actual,
 * git-derived commit SHA. A forged `approval: true` in frontmatter has no code path
 * into this function — the schema in src/content.config.ts doesn't even accept such
 * a field.
 */
export function isApproved(
  entry: CollectionEntry<'articles' | 'briefs'>,
  manifest: ApprovalManifest = loadApprovalManifest(),
): boolean {
  if (!entry.filePath) return false;
  const actualSha = commitShaForFile(entry.filePath);
  return isApprovedFor(manifestKeyFor(entry), actualSha, manifest);
}
