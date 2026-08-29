// Content validation and authorization are deliberately separate functions.
// Frontmatter is author-controlled and can never grant approval - see
// docs/editorial/publication-gates.md. isContentValid() only checks shape.
// isApproved() only trusts a CI-generated approval manifest, keyed by canonical
// URL, that must match the exact commit the record was built from.

export function isContentValid(record) {
  return record.status === 'scheduled'
    && typeof record.title === 'string' && record.title.length > 0
    && typeof record.canonical === 'string' && record.canonical.startsWith('https://runtimesignals.tech/')
    && Array.isArray(record.sources) && record.sources.length > 0
    && typeof record.commit_sha === 'string' && record.commit_sha.length > 0;
}

export function isPublishable(record, now = new Date()) {
  return isContentValid(record) && new Date(record.published_at) <= now;
}

// approvalManifest: Map<canonical, { commit_sha, required_checks_passed,
// codeowners_approved, deployment_environment_authorized }>. This stands in for
// the real artifact: a build-time manifest generated from protected-branch
// review state, required check-run results, CODEOWNERS approval, and
// deployment-environment authorization - never from the record itself.
export function isApproved(record, approvalManifest) {
  const entry = approvalManifest instanceof Map
    ? approvalManifest.get(record.canonical)
    : approvalManifest?.[record.canonical];

  return Boolean(entry)
    && entry.commit_sha === record.commit_sha
    && entry.required_checks_passed === true
    && entry.codeowners_approved === true
    && entry.deployment_environment_authorized === true;
}

export function canPublish(record, approvalManifest, now = new Date()) {
  return isPublishable(record, now) && isApproved(record, approvalManifest);
}
