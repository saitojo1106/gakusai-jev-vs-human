declare namespace Cloudflare {
  interface Env {
    GAME_KV: KVNamespace;
    ASSETS: Fetcher;
    AI_GATEWAY_API_KEY?: string;
    JEV_MODEL?: string;
    JEV_TIMEOUT_MS?: string;
    PUBLIC_ORIGIN?: string;
    JUDGE?: string;
  }
}

type AppBindings = Cloudflare.Env;
