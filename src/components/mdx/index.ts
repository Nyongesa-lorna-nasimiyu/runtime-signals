// The complete MDX component allow-list. Any component an article needs must be
// added here - never imported ad hoc inside a .mdx file. Enforced at build time by
// scripts/check-mdx-imports.mjs; see docs/security/threat-model.md.
export { default as Callout } from './Callout.astro';
export { default as Figure } from './Figure.astro';
