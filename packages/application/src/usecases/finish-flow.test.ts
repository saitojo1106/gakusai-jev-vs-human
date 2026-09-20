import { LEADERBOARD_SIZE, PASSENGERS_PER_SHIFT } from '@game/domain';
import type { AirportName, Confidence, HumanDecision, LeaderboardEntry, ResultId } from '@game/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeJudge } from '../fakes/fake-judge.js';
import {
  FixedClock,
  InMemoryLeaderboard,
  InMemoryResultStore,
  InMemoryShiftStore,
  StubIdGenerator,
} from '../fakes/in-memory-stores.js';
import type { UsecaseDeps } from '../ports.js';
import { createUsecases } from './index.js';

const decision = (over: Partial<HumanDecision> = {}): HumanDecision => ({
  verdict: 'pass',
  confidence: 0.8 as Confidence,
  elapsedMs: 20_000,
  inspected: ['identity'],
  ...over,
});

let shifts: InMemoryShiftStore;
let results: InMemoryResultStore;
let leaderboard: InMemoryLeaderboard;
let clock: FixedClock;
let usecases: ReturnType<typeof createUsecases>;

const build = (over: Partial<UsecaseDeps> = {}) => {
  shifts = new InMemoryShiftStore();
  results = new InMemoryResultStore();
  leaderboard = new InMemoryLeaderboard();
  clock = new FixedClock();
  usecases = createUsecases({
    judge: new FakeJudge(),
    shifts,
    results,
    leaderboard,
    ids: new StubIdGenerator(['shift001'], ['result01'], ['seed0001']),
    clock,
    publicOrigin: 'https://example.test',
    ...over,
  });
};

const playAll = async (airport = 'ぼくの空港') => {
  await usecases.startShift({ airport });
  for (let index = 0; index < PASSENGERS_PER_SHIFT; index += 1) {
    await usecases.submitVerdict({ shiftId: 'shift001', index, decision: decision() });
  }
};

beforeEach(() => build());

describe('finishShift', () => {
  it('結果を保存して共有 URL を返す', async () => {
    await playAll();
    const { resultId, url } = await usecases.finishShift({ shiftId: 'shift001' });

    expect(resultId).toBe('result01');
    expect(url).toBe('https://example.test/r/result01');
    expect(results.results.get('result01')?.reveals).toHaveLength(PASSENGERS_PER_SHIFT);
  });

  it('集計・勝敗・レベルを結果に含める', async () => {
    await playAll();
    await usecases.finishShift({ shiftId: 'shift001' });
    const saved = results.results.get('result01');

    expect(saved?.totals.human.correct).toBeGreaterThanOrEqual(0);
    expect(['human', 'jev', 'draw']).toContain(saved?.winner);
    expect([1, 2, 3, 4, 5]).toContain(saved?.level);
    expect(saved?.finishedAt).toBe(clock.now().toISOString());
    expect(saved?.seed).toBe('seed0001');
  });

  it('Jev の所要時間は並列実行の壁時計時間を使う', async () => {
    await playAll();
    await usecases.finishShift({ shiftId: 'shift001' });
    const saved = results.results.get('result01');

    expect(saved?.totals.jev.elapsedMs).toBeGreaterThan(0);
    expect(saved?.totals.jev.elapsedMs).toBeLessThan(saved?.totals.human.elapsedMs ?? 0);
  });

  it('ランキングに 1 件登録する', async () => {
    await playAll('羽田第 3');
    await usecases.finishShift({ shiftId: 'shift001' });
    const entry = leaderboard.entries[0] as LeaderboardEntry;

    expect(entry.resultId).toBe('result01');
    expect(entry.airport).toBe('羽田第 3');
    expect(entry.points).toBe(results.results.get('result01')?.totals.human.points);
    expect(entry.marginOverJev).toBe(
      (results.results.get('result01')?.totals.human.points ?? 0) -
        (results.results.get('result01')?.totals.jev.points ?? 0),
    );
  });

  it('10 人終わっていなければ shift_incomplete', async () => {
    await usecases.startShift({ airport: 'ぼくの空港' });
    await usecases.submitVerdict({ shiftId: 'shift001', index: 0, decision: decision() });

    await expect(usecases.finishShift({ shiftId: 'shift001' })).rejects.toMatchObject({
      code: 'shift_incomplete',
    });
  });

  it('存在しないシフトは shift_not_found', async () => {
    await expect(usecases.finishShift({ shiftId: 'nope' })).rejects.toMatchObject({
      code: 'shift_not_found',
    });
  });

  it('結果 ID が衝突したら別の ID を取り直す', async () => {
    build({ ids: new StubIdGenerator(['shift001'], ['taken001', 'free0001'], ['seed0001']) });
    await results.save({
      resultId: 'taken001' as ResultId,
      shiftId: 'other' as never,
      seed: 'other' as never,
      airport: 'よその空港' as AirportName,
      finishedAt: '2026-09-19T00:00:00.000Z',
      reveals: [],
      totals: {
        human: { points: 0, correct: 0, missedThreats: 0, falseDetains: 0, elapsedMs: 0 },
        jev: { points: 0, correct: 0, missedThreats: 0, falseDetains: 0, elapsedMs: 0 },
      },
      winner: 'draw',
      level: 1,
    });

    await playAll();
    const { resultId } = await usecases.finishShift({ shiftId: 'shift001' });

    expect(resultId).toBe('free0001');
    expect(results.results.get('taken001')?.airport).toBe('よその空港');
  });

  it('2 回目の finish は同じ結果を返し、ランキングを二重登録しない', async () => {
    await playAll();
    const first = await usecases.finishShift({ shiftId: 'shift001' });
    const second = await usecases.finishShift({ shiftId: 'shift001' });

    expect(second.resultId).toBe(first.resultId);
    expect(leaderboard.entries).toHaveLength(1);
  });
});

describe('getResult', () => {
  it('保存した結果を返す', async () => {
    await playAll();
    const { resultId } = await usecases.finishShift({ shiftId: 'shift001' });
    const result = await usecases.getResult({ resultId });

    expect(result.resultId).toBe(resultId);
    expect(result.reveals).toHaveLength(PASSENGERS_PER_SHIFT);
  });

  it('存在しない結果は result_not_found', async () => {
    await expect(usecases.getResult({ resultId: 'nope' })).rejects.toMatchObject({
      code: 'result_not_found',
    });
  });
});

describe('getRanking', () => {
  const entry = (over: Partial<LeaderboardEntry>): LeaderboardEntry => ({
    resultId: 'r1' as ResultId,
    airport: 'ぼくの空港' as AirportName,
    level: 3,
    points: 100,
    marginOverJev: 0,
    finishedAt: '2026-09-20T05:00:00.000Z',
    ...over,
  });

  it('スコアの高い順に返す', async () => {
    await leaderboard.add(entry({ resultId: 'low' as ResultId, points: 80 }));
    await leaderboard.add(entry({ resultId: 'high' as ResultId, points: 160 }));
    await leaderboard.add(entry({ resultId: 'mid' as ResultId, points: 120 }));

    const ranking = await usecases.getRanking({});
    expect(ranking.map((e) => e.resultId)).toEqual(['high', 'mid', 'low']);
  });

  it('既定は 20 件まで', async () => {
    for (let i = 0; i < 60; i += 1) {
      await leaderboard.add(entry({ resultId: `r${i}` as ResultId, points: i }));
    }
    expect(await usecases.getRanking({})).toHaveLength(LEADERBOARD_SIZE);
  });

  it('20 件より多く要求されても 20 件までに丸める', async () => {
    for (let i = 0; i < 60; i += 1) {
      await leaderboard.add(entry({ resultId: `r${i}` as ResultId, points: i }));
    }
    expect(await usecases.getRanking({ limit: 100 })).toHaveLength(LEADERBOARD_SIZE);
  });

  it('空港名で絞り込める', async () => {
    await leaderboard.add(entry({ resultId: 'mine' as ResultId, airport: '羽田第 3' as AirportName }));
    await leaderboard.add(entry({ resultId: 'other' as ResultId, airport: 'よその空港' as AirportName }));

    const ranking = await usecases.getRanking({ airport: '羽田第 3' });
    expect(ranking.map((e) => e.resultId)).toEqual(['mine']);
  });

  it('件数の上限を指定できる', async () => {
    await leaderboard.add(entry({ resultId: 'a' as ResultId, points: 10 }));
    await leaderboard.add(entry({ resultId: 'b' as ResultId, points: 20 }));
    expect(await usecases.getRanking({ limit: 1 })).toHaveLength(1);
  });
});
