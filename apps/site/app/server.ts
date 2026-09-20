import { createApp } from 'honox/server';
import { createApi } from './api/index.js';
import { createDeps } from './deps.js';

const app = createApp({
  init: (app) => {
    app.all('/api/*', (c) => {
      const api = createApi(createDeps(c.env as AppBindings, c.req.url));
      return api.fetch(c.req.raw, c.env, c.executionCtx);
    });
  },
});

export default app;
