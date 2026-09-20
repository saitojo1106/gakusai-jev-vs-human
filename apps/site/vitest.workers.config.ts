import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

const migrations = await readD1Migrations(new URL('./migrations', import.meta.url).pathname);

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: '2026-08-22',
        compatibilityFlags: ['nodejs_compat'],
        d1Databases: ['GAME_DB'],
        bindings: { TEST_MIGRATIONS: migrations },
      },
    }),
  ],
  test: {
    name: 'site-workers',
    include: ['app/**/*.workers.test.ts'],
    setupFiles: ['./app/adapters/__tests__/apply-migrations.ts'],
  },
});
