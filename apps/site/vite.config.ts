import build from '@hono/vite-build/cloudflare-workers';
import adapter from '@hono/vite-dev-server/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import honox from 'honox/vite';
import client from 'honox/vite/client';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      plugins: [client(), tailwindcss()],
      build: {
        outDir: './dist/static',
        rollupOptions: { input: ['./app/client.ts', './app/style.css'] },
      },
    };
  }

  return {
    plugins: [honox({ devServer: { adapter } }), tailwindcss(), build({ outputDir: './dist' })],
    build: { emptyOutDir: false },
    publicDir: './public',
  };
});
