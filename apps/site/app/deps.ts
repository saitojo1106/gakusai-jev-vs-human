import { FakeJudge } from '@game/application/fakes';
import type { JudgePort, UsecaseDeps } from '@game/application';
import { JevGatewayJudge } from './adapters/jev-gateway-judge.js';
import { CryptoIdGenerator, SystemClock } from './adapters/crypto-ids.js';
import { D1Leaderboard } from './adapters/d1-leaderboard.js';
import { D1ResultStore } from './adapters/d1-result-store.js';
import { D1ShiftStore } from './adapters/d1-shift-store.js';

export const createJudge = (env: AppBindings): JudgePort => {
  if (env.JUDGE === 'fake' || env.AI_GATEWAY_API_KEY === undefined) return new FakeJudge();
  return new JevGatewayJudge({
    apiKey: env.AI_GATEWAY_API_KEY,
    ...(env.JEV_MODEL === undefined ? {} : { model: env.JEV_MODEL }),
    ...(env.JEV_TIMEOUT_MS === undefined ? {} : { timeoutMs: Number(env.JEV_TIMEOUT_MS) }),
    zeroDataRetention: env.JEV_ZDR === 'true',
  });
};

export const createDeps = (env: AppBindings, requestUrl: string): UsecaseDeps => ({
  judge: createJudge(env),
  shifts: new D1ShiftStore(env.GAME_DB),
  results: new D1ResultStore(env.GAME_DB),
  leaderboard: new D1Leaderboard(env.GAME_DB),
  ids: new CryptoIdGenerator(),
  clock: new SystemClock(),
  publicOrigin: env.PUBLIC_ORIGIN ?? new URL(requestUrl).origin,
});
