import { LEADERBOARD_SIZE, PASSENGERS_PER_SHIFT } from '@game/domain';
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
import { D1Leaderboard } from './d1-leaderboard.js';
import { D1ResultStore } from './d1-result-store.js';
import { D1ShiftStore } from './d1-shift-store.js';

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
  jev: Array.from({ length: PASSENGERS_PER_SHIFT }, () => ({ decision: decided, latencyMs: 210 })),
  jevWallMs: 830,
  human: Array.from({ length: PASSENGERS_PER_SHIFT }, () => null),
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

beforeEach(async () => {
  await env.GAME_DB.batch([
    env.GAME_DB.prepare('DELETE FROM decisions'),
    env.GAME_DB.prepare('DELETE FROM shifts'),
    env.GAME_DB.prepare('DELETE FROM results'),
    env.GAME_DB.prepare('DELETE FROM leaderboard'),
  ]);
});

describe('D1ShiftStore', () => {
  const store = () => new D1ShiftStore(env.GAME_DB);

  it('保存して読み戻せる', async () => {
    await store().create(record());
    expect(await store().get('shift001' as ShiftId)).toEqual(record());
  });

  it('すでに判定の入ったレコードもそのまま往復できる', async () => {
    const human = Array.from({ length: PASSENGERS_PER_SHIFT }, () => null) as (
      | HumanDecision
      | null
    )[];
    human[2] = decision({ verdict: 'detain' });
    await store().create(record({ human, xrayUsedOn: 5 as PassengerIndex }));

    const loaded = await store().get('shift001' as ShiftId);
    expect(loaded?.human[2]?.verdict).toBe('detain');
    expect(loaded?.human[1]).toBeNull();
    expect(loaded?.xrayUsedOn).toBe(5);
  });

  it('存在しないシフトは null', async () => {
    expect(await store().get('missing' as ShiftId)).toBeNull();
  });

  it('期限切れのシフトは null', async () => {
    await new D1ShiftStore(env.GAME_DB, -10).create(record());
    expect(await store().get('shift001' as ShiftId)).toBeNull();
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

  it('同じ乗客への同時書き込みは 1 回しか通らない', async () => {
    await store().create(record());
    const settled = await Promise.allSettled([
      store().recordHuman('shift001' as ShiftId, 0 as PassengerIndex, decision()),
      store().recordHuman('shift001' as ShiftId, 0 as PassengerIndex, decision()),
      store().recordHuman('shift001' as ShiftId, 0 as PassengerIndex, decision()),
    ]);

    expect(settled.filter((s) => s.status === 'fulfilled')).toHaveLength(1);
  });

  it('存在しないシフトへの書き込みは弾く', async () => {
    await expect(
      store().recordHuman('missing' as ShiftId, 0 as PassengerIndex, decision()),
    ).rejects.toMatchObject({ code: 'shift_not_found' });
  });

  it('X 線は 1 シフトに 1 回だけ', async () => {
    await store().create(record());
    const updated = await store().useXray('shift001' as ShiftId, 4 as PassengerIndex);
    expect(updated.xrayUsedOn).toBe(4);

    await expect(
      store().useXray('shift001' as ShiftId, 5 as PassengerIndex),
    ).rejects.toMatchObject({ code: 'xray_used' });
  });

  it('X 線の同時実行も 1 回しか通らない', async () => {
    await store().create(record());
    const settled = await Promise.allSettled([
      store().useXray('shift001' as ShiftId, 1 as PassengerIndex),
      store().useXray('shift001' as ShiftId, 2 as PassengerIndex),
    ]);

    expect(settled.filter((s) => s.status === 'fulfilled')).toHaveLength(1);
  });

  it('存在しないシフトへの X 線は shift_not_found', async () => {
    await expect(store().useXray('missing' as ShiftId, 0 as PassengerIndex)).rejects.toMatchObject({
      code: 'shift_not_found',
    });
  });

  it('結果 ID を結び付けられる', async () => {
    await store().create(record());
    await store().attachResult('shift001' as ShiftId, 'result01' as ResultId);
    expect((await store().get('shift001' as ShiftId))?.resultId).toBe('result01');
  });

  it('壊れた JSON が入っていても null にする', async () => {
    await store().create(record());
    await env.GAME_DB.prepare('UPDATE shifts SET jev = ? WHERE id = ?')
      .bind('{ not json', 'shift001')
      .run();
    expect(await store().get('shift001' as ShiftId)).toBeNull();
  });
});

describe('D1ResultStore', () => {
  const store = () => new D1ResultStore(env.GAME_DB);

  it('保存して読み戻せる', async () => {
    await store().save(result());
    expect(await store().get('result01' as ResultId)).toEqual(result());
  });

  it('同じ結果を 2 回保存しても壊れない', async () => {
    await store().save(result());
    await store().save(result());
    expect(await store().get('result01' as ResultId)).toEqual(result());
  });

  it('存在しない結果は null', async () => {
    expect(await store().get('missing' as ResultId)).toBeNull();
  });

  it('壊れた値は null にする', async () => {
    await store().save(result());
    await env.GAME_DB.prepare('UPDATE results SET totals = ? WHERE id = ?')
      .bind('nope', 'result01')
      .run();
    expect(await store().get('result01' as ResultId)).toBeNull();
  });
});

describe('D1Leaderboard', () => {
  const board = () => new D1Leaderboard(env.GAME_DB);

  it('登録してスコア順に返す', async () => {
    await board().add(entry({ resultId: 'low' as ResultId, points: 80 }));
    await board().add(entry({ resultId: 'high' as ResultId, points: 160 }));
    await board().add(entry({ resultId: 'mid' as ResultId, points: 120 }));

    expect((await board().top(10)).map((e) => e.resultId)).toEqual(['high', 'mid', 'low']);
  });

  it('同点なら新しい方を上に出す', async () => {
    await board().add(
      entry({ resultId: 'old' as ResultId, finishedAt: '2026-09-20T01:00:00.000Z' }),
    );
    await board().add(
      entry({ resultId: 'new' as ResultId, finishedAt: '2026-09-20T09:00:00.000Z' }),
    );

    expect((await board().top(10)).map((e) => e.resultId)).toEqual(['new', 'old']);
  });

  it('同時に登録しても取りこぼさない', async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        board().add(entry({ resultId: `r${i}` as ResultId, points: i })),
      ),
    );

    expect(await board().top(LEADERBOARD_SIZE)).toHaveLength(10);
  });

  it('同じ結果を 2 回登録しても 1 件にする', async () => {
    await board().add(entry());
    await board().add(entry());
    expect(await board().top(10)).toHaveLength(1);
  });

  it('件数を絞って返す', async () => {
    for (let i = 0; i < 10; i += 1) {
      await board().add(entry({ resultId: `r${i}` as ResultId, points: i }));
    }
    expect(await board().top(3)).toHaveLength(3);
  });

  it('上限より多く入っていても、求められた件数までしか返さない', async () => {
    for (let i = 0; i < LEADERBOARD_SIZE + 10; i += 1) {
      await board().add(entry({ resultId: `r${i}` as ResultId, points: i }));
    }
    const top = await board().top(LEADERBOARD_SIZE);
    expect(top).toHaveLength(LEADERBOARD_SIZE);
    expect(top[0]?.points).toBe(LEADERBOARD_SIZE + 9);
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
});
