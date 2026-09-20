import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'application',
    include: ['src/**/*.test.ts'],
  },
});
