import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'site',
    include: ['app/**/*.test.ts'],
    exclude: ['app/**/*.workers.test.ts'],
  },
});
