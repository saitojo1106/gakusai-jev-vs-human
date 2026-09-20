import type {
  AirportName,
  Confidence,
  HumanDecision,
  LeaderboardEntry,
  PassengerIndex,
  ResultId,
  Seed,
  ShiftId,
  ShiftRecord,
  ShiftResult,
} from '@game/domain';
import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { KvLeaderboard } from './kv-leaderboard.js';
import { KvResultStore } from './kv-result-store.js';
import { KvShiftStore } from './kv-shift-store.js';

const decided = {
  kind: 'decided',
  verdict: 'detain',
  verdictConfidence: 0.98,
  threatProbability: 0.91,
  suspicion: 3,
  aspects: { documents: 0.8, belongings: 0.6, interview: 0.3, body: 0.2, background: 0.1 },
} as const;

const record = (over: Partial<ShiftRecord> = {}): ShiftRecord => ({
  shiftId: 'shift001' as ShiftId,
  seed: 'seed0001' as Seed,
  airport: 'ぼくの空港' as AirportName,
  startedAt: '2026-09-20T05:00:00.000Z',
  jev: Array.from({ length: 10 }, () => ({ decision: decided, latencyMs: 210 })),
  jevWallMs: 830,
  human: Array.from({ length: 10 }, () => null),
  xrayUsedOn: null,
  resultId: null,
  ...over,
});

const decision = (over: Partial<HumanDecision> = {}): HumanDecision => ({
  verdict: 'pass',
  confidence: 0.8 as Confidence,
  elapsedMs: 20_000,
  inspected: ['identity'],
  ...over,
});

const result = (over: Partial<ShiftResult> = {}): ShiftResult => ({
  resultId: 'result01' as ResultId,
  shiftId: 'shift001' as ShiftId,
  seed: 'seed0001' as Seed,
  airport: 'ぼくの空港' as AirportName,
  finishedAt: '2026-09-20T05:10:00.000Z',
  reveals: [],
  totals: {
    human: { points: 130, correct: 8, missedThreats: 1, falseDetains: 1, elapsedMs: 372_000 },
    jev: { points: 100, correct: 7, missedThreats: 2, falseDetains: 1, elapsedMs: 830 },
  },
  winner: 'human',
  level: 4,
  ...over,
});

const entry = (over: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  resultId: 'result01' as ResultId,
  airport: 'ぼくの空港' as AirportName,
  level: 4,
  points: 130,
  marginOverJev: 30,
  finishedAt: '2026-09-20T05:10:00.000Z',
  ...over,
});

const clearKv = async () => {
  const { keys } = await env.GAME_KV.list();
  await Promise.all(keys.map((k) => env.GAME_KV.delete(k.name)));
};

beforeEach(clearKv);

describe('KvShiftStore', () => {
  const store = () => new KvShiftStore(env.GAME_KV);

  it('保存して読み戻せる', async () => {
    await store().create(record());
    expect(await store().get('shift001' as ShiftId)).toEqual(record());
  });

  it('shift: 接頭辞のキーに入れる', async () => {
    await store().create(record());
    const { keys } = await env.GAME_KV.list();
    expect(keys.map((k) => k.name)).toEqual(['shift:shift001']);
  });

  it('24 時間の TTL を付ける', async () => {
    await store().create(record());
    const { keys } = await env.GAME_KV.list();
    const expiration = keys[0]?.expiration ?? 0;
    const expected = Date.now() / 1000 + 86_400;
    expect(Math.abs(expiration - expected)).toBeLessThan(120);
  });

  it('存在しないシフトは null', async () => {
    expect(await store().get('missing' as ShiftId)).toBeNull();
  });

  it('壊れた JSON は null にする', async () => {
    await env.GAME_KV.put('shift:broken', '{ not json');
    expect(await store().get('broken' as ShiftId)).toBeNull();
  });

  it('形の違うレコードは null にする', async () => {
    await env.GAME_KV.put('shift:odd', JSON.stringify({ shiftId: 'odd' }));
    expect(await store().get('odd' as ShiftId)).toBeNull();
  });

  it('人間の判定を該当の枠に書き込む', async () => {
    await store().create(record());
    const updated = await store().recordHuman(
      'shift001' as ShiftId,
      3 as PassengerIndex,
      decision({ verdict: 'detain' }),
    );

    expect(updated.human[3]?.verdict).toBe('detain');
    expect(updated.human[2]).toBeNull();
    expect((await store().get('shift001' as ShiftId))?.human[3]?.verdict).toBe('detain');
  });

  it('同じ乗客に 2 回書き込もうとしたら弾く', async () => {
    await store().create(record());
    await store().recordHuman('shift001' as ShiftId, 0 as PassengerIndex, decision());

    await expect(
      store().recordHuman('shift001' as ShiftId, 0 as PassengerIndex, decision()),
    ).rejects.toMatchObject({ code: 'already_decided' });
  });

  it('存在しないシフトへの書き込みは弾く', async () => {
    await expect(
      store().recordHuman('missing' as ShiftId, 0 as PassengerIndex, decision()),
    ).rejects.toMatchObject({ code: 'shift_not_found' });
  });

  it('結果 ID を結び付けられる', async () => {
    await store().create(record());
    await store().attachResult('shift001' as ShiftId, 'result01' as ResultId);
    expect((await store().get('shift001' as ShiftId))?.resultId).toBe('result01');
  });

  it('判定を書き込んでも TTL を延ばし続ける', async () => {
    await store().create(record());
    await store().recordHuman('shift001' as ShiftId, 0 as PassengerIndex, decision());
    const { keys } = await env.GAME_KV.list();
    expect(keys[0]?.expiration).toBeGreaterThan(Date.now() / 1000);
  });
});

describe('KvResultStore', () => {
  const store = () => new KvResultStore(env.GAME_KV);

  it('保存して読み戻せる', async () => {
    await store().save(result());
    expect(await store().get('result01' as ResultId)).toEqual(result());
  });

  it('result: 接頭辞のキーに入れる', async () => {
    await store().save(result());
    const { keys } = await env.GAME_KV.list();
    expect(keys.map((k) => k.name)).toEqual(['result:result01']);
  });

  it('TTL を付けない', async () => {
    await store().save(result());
    const { keys } = await env.GAME_KV.list();
    expect(keys[0]?.expiration).toBeUndefined();
  });

  it('存在しない結果は null', async () => {
    expect(await store().get('missing' as ResultId)).toBeNull();
  });

  it('壊れた値は null にする', async () => {
    await env.GAME_KV.put('result:broken', 'nope');
    expect(await store().get('broken' as ResultId)).toBeNull();
  });
});

describe('KvLeaderboard', () => {
  const board = () => new KvLeaderboard(env.GAME_KV);

  it('登録してスコア順に返す', async () => {
    await board().add(entry({ resultId: 'low' as ResultId, points: 80 }));
    await board().add(entry({ resultId: 'high' as ResultId, points: 160 }));
    await board().add(entry({ resultId: 'mid' as ResultId, points: 120 }));

    expect((await board().top(10)).map((e) => e.resultId)).toEqual(['high', 'mid', 'low']);
  });

  it('board:top の 1 キーにまとめる', async () => {
    await board().add(entry());
    const { keys } = await env.GAME_KV.list();
    expect(keys.map((k) => k.name)).toEqual(['board:top']);
  });

  it('100 件を超えたら下位から捨てる', async () => {
    for (let i = 0; i < 120; i += 1) {
      await board().add(entry({ resultId: `r${i}` as ResultId, points: i }));
    }
    const stored = JSON.parse((await env.GAME_KV.get('board:top')) ?? '[]');
    expect(stored).toHaveLength(100);
    expect(stored[0].points).toBe(119);
    expect(stored[99].points).toBe(20);
  });

  it('件数を絞って返す', async () => {
    for (let i = 0; i < 10; i += 1) {
      await board().add(entry({ resultId: `r${i}` as ResultId, points: i }));
    }
    expect(await board().top(3)).toHaveLength(3);
  });

  it('空港名で絞り込める', async () => {
    await board().add(entry({ resultId: 'mine' as ResultId, airport: '羽田第 3' as AirportName }));
    await board().add(entry({ resultId: 'other' as ResultId, airport: 'よその空港' as AirportName }));

    const filtered = await board().top(10, '羽田第 3' as AirportName);
    expect(filtered.map((e) => e.resultId)).toEqual(['mine']);
  });

  it('まだ誰も登録していなければ空を返す', async () => {
    expect(await board().top(10)).toEqual([]);
  });

  it('壊れた値が入っていても空として扱う', async () => {
    await env.GAME_KV.put('board:top', '{ broken');
    expect(await board().top(10)).toEqual([]);
  });

  it('壊れた値の上に登録できる', async () => {
    await env.GAME_KV.put('board:top', '{ broken');
    await board().add(entry());
    expect(await board().top(10)).toHaveLength(1);
  });
});
