import build from '@hono/vite-build/cloudflare-workers';
import adapter from '@hono/vite-dev-server/cloudflare';
import honox from 'honox/vite';
import client from 'honox/vite/client';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      plugins: [client()],
      build: {
        outDir: './dist/static',
        rollupOptions: { input: ['./app/client.ts'] },
      },
    };
  }

  return {
    plugins: [honox({ devServer: { adapter } }), build({ outputDir: './dist' })],
    build: { emptyOutDir: false },
    publicDir: './public',
  };
});
