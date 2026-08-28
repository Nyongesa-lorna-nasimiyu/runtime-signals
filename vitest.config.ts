/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig wires up the same Vite pipeline Astro uses, so test files can
// import astro:content / astro/loaders (src/content.config.ts) and the alias
// `@/*` exactly as application code does.
export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/content.config.ts'],
    },
  },
});
