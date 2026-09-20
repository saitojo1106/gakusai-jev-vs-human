import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/*',
      'apps/site/vitest.config.ts',
      'apps/site/vitest.workers.config.ts',
    ],
  },
});
