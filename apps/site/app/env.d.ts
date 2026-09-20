declare namespace Cloudflare {
  interface Env {
    GAME_DB: D1Database;
    ASSETS: Fetcher;
    AI_GATEWAY_API_KEY?: string;
    JEV_MODEL?: string;
    JEV_TIMEOUT_MS?: string;
    PUBLIC_ORIGIN?: string;
    JUDGE?: string;
    JEV_ZDR?: string;
  }
}

type AppBindings = Cloudflare.Env;
