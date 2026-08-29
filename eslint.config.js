// @ts-check
// Note: eslint-plugin-jsx-a11y is deliberately not installed here. As of this
// scaffold, no published jsx-a11y release supports ESLint 10 (it caps at ^9), while
// eslint-plugin-astro@3.1.0 requires ESLint >=10 - a real, currently unresolved
// upstream conflict, not an oversight.
//
// This is a real, recorded coverage gap, not a like-for-like substitution:
// tests/a11y/basic.spec.ts (axe-core) checks real DOM/ARIA output, which
// jsx-a11y's static rules can't do - but only for the routes, fixtures, and
// interaction states those tests actually visit. jsx-a11y also catches classes of
// mistake axe cannot, because they're visible in source before anything renders:
// a missing alt prop on every <img>, an onClick without a keyboard handler, in
// any component whether or not a test ever mounts it. Do not destabilize the
// toolchain (e.g. downgrading ESLint) merely to restore the plugin - revisit once
// jsx-a11y ships ESLint 10 support, and track the gap explicitly until then.
import eslintPluginAstro from 'eslint-plugin-astro';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**', 'docs/**'],
  },
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.astro'],
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  eslintConfigPrettier,
);
