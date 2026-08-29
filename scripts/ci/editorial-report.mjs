// Pure logic for the PR editorial quality report - advisory only, never
// blocks a build or gates a merge (see docs/editorial/pr-editorial-report.md
// and .github/workflows/pr-editorial-report.yml). Separated from the git/
// GitHub API/frontmatter-reading I/O in scripts/ci/run-editorial-report.mjs
// for direct unit testing (tests/unit/editorial-report.test.ts) - the same
// split as scripts/ci/github-checks.mjs and scripts/ci/schedule-decision.mjs.

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'for',
  'is',
  'are',
  'with',
  'as',
  'it',
  'be',
  'by',
  'that',
  'this',
  'at',
  'from',
  'not',
  'but',
]);

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (w) => !STOPWORDS.has(w) && w.length > 2,
  );
}

/** Word-overlap similarity in [0, 1] - crude but dependency-free, and good
 * enough for an advisory "you might want to check this" signal, not a hard
 * gate. */
export function jaccardSimilarity(a, b) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const word of setA) if (setB.has(word)) intersection++;
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/** How this piece's title/description would render in a search result -
 * plus the same length guidelines a real SEO review would apply. */
export function seoPreview(record) {
  const displayTitle = `${record.title} - Runtime Signals`;
  const description = record.seoDescription || record.dek || '';
  const warnings = [];
  if (displayTitle.length > 60) {
    warnings.push(
      `Title (${displayTitle.length} chars) may truncate in search results (~60 char guideline).`,
    );
  }
  if (!description) {
    warnings.push('No seo.description or dek available for the meta description.');
  } else if (description.length < 50) {
    warnings.push(`Description is short (${description.length} chars; ~50-160 is typical).`);
  } else if (description.length > 160) {
    warnings.push(
      `Description (${description.length} chars) may truncate in search results (~160 char guideline).`,
    );
  }
  return { displayTitle, description, warnings };
}

/** Other pieces whose title+dek overlap this one's beyond the threshold -
 * a possible-duplicate-coverage signal for an editor to confirm, not a
 * verdict. 0.35 is deliberately lenient: false positives cost a reviewer one
 * glance at a report; false negatives cost a silently duplicated article. */
export function findPossibleDuplicates(target, others, threshold = 0.35) {
  return others
    .filter((o) => o.key !== target.key)
    .map((o) => ({
      key: o.key,
      title: o.title,
      score: jaccardSimilarity(`${target.title} ${target.dek}`, `${o.title} ${o.dek}`),
    }))
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

/** Other content whose title appears in this piece's body text but isn't
 * already a markdown link at that exact spot - an internal-link suggestion,
 * not an enforced requirement. Checks exact bracket adjacency at the match
 * position (bodyText[idx-1] === '[' and the character right after the title
 * is ']'), not a fuzzy nearby-brackets heuristic - deliberately precise
 * enough to avoid false "already linked" negatives, and simple enough that
 * a false-negative miss (an already-linked mention phrased slightly
 * differently) just means one redundant suggestion, not a wrong one. */
export function findUnlinkedMentions(bodyText, candidates) {
  const lower = bodyText.toLowerCase();
  const results = [];
  for (const candidate of candidates) {
    if (!candidate.title || candidate.title.length < 4) continue;
    const idx = lower.indexOf(candidate.title.toLowerCase());
    if (idx === -1) continue;
    const alreadyLinked =
      bodyText[idx - 1] === '[' && bodyText[idx + candidate.title.length] === ']';
    if (!alreadyLinked) results.push(candidate);
  }
  return results;
}

/** Tally of claims by evidence strength, plus what fraction are `supported`
 * - a coarse, at-a-glance source-coverage signal, not a substitute for
 * docs/editorial/source-policy.md's actual review. */
export function citationCoverage(claims) {
  const byEvidence = { supported: 0, mixed: 0, inference: 0, opinion: 0 };
  for (const claim of claims) {
    if (claim.evidence in byEvidence) byEvidence[claim.evidence]++;
  }
  const total = claims.length;
  return {
    total,
    ...byEvidence,
    supportedRatio: total === 0 ? null : byEvidence.supported / total,
  };
}
