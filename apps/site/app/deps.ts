import { FakeJudge } from '@game/application/fakes';
import type { JudgePort, UsecaseDeps } from '@game/application';
import { JevGatewayJudge } from './adapters/jev-gateway-judge.js';
import { CryptoIdGenerator, SystemClock } from './adapters/crypto-ids.js';
import { KvLeaderboard } from './adapters/kv-leaderboard.js';
import { KvResultStore } from './adapters/kv-result-store.js';
import { KvShiftStore } from './adapters/kv-shift-store.js';

export const createJudge = (env: AppBindings): JudgePort => {
  if (env.JUDGE === 'fake' || env.AI_GATEWAY_API_KEY === undefined) return new FakeJudge();
  return new JevGatewayJudge({
    apiKey: env.AI_GATEWAY_API_KEY,
    ...(env.JEV_MODEL === undefined ? {} : { model: env.JEV_MODEL }),
    ...(env.JEV_TIMEOUT_MS === undefined ? {} : { timeoutMs: Number(env.JEV_TIMEOUT_MS) }),
  });
};

export const createDeps = (env: AppBindings, requestUrl: string): UsecaseDeps => ({
  judge: createJudge(env),
  shifts: new KvShiftStore(env.GAME_KV),
  results: new KvResultStore(env.GAME_KV),
  leaderboard: new KvLeaderboard(env.GAME_KV),
  ids: new CryptoIdGenerator(),
  clock: new SystemClock(),
  publicOrigin: env.PUBLIC_ORIGIN ?? new URL(requestUrl).origin,
});
