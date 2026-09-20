import { generatePassenger, PASSENGERS_PER_SHIFT } from '@game/domain';
import type { Confidence, HumanDecision, PassengerIndex, Seed, ShiftId } from '@game/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../errors.js';
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
let deps: UsecaseDeps;
let usecases: ReturnType<typeof createUsecases>;

const build = (over: Partial<UsecaseDeps> = {}) => {
  shifts = new InMemoryShiftStore();
  results = new InMemoryResultStore();
  leaderboard = new InMemoryLeaderboard();
  clock = new FixedClock();
  deps = {
    judge: new FakeJudge(),
    shifts,
    results,
    leaderboard,
    ids: new StubIdGenerator(['shift001'], ['result01'], ['seed0001']),
    clock,
    publicOrigin: 'https://example.test',
    ...over,
  };
  usecases = createUsecases(deps);
};

beforeEach(() => build());

describe('startShift', () => {
  it('シフトを作り、Jev の計測結果だけを返す', async () => {
    const response = await usecases.startShift({ airport: 'ぼくの空港' });

    expect(response.shiftId).toBe('shift001');
    expect(response.jev.perPassengerMs).toHaveLength(PASSENGERS_PER_SHIFT);
    expect(response.jev.totalMs).toBeGreaterThan(0);
    expect(response.jev.failed).toBe(0);
    expect(JSON.stringify(response)).not.toContain('verdict');
  });

  it('Jev の判定を 10 件保存し、人間の枠を 10 件空けておく', async () => {
    await usecases.startShift({ airport: 'ぼくの空港' });
    const record = shifts.records.get('shift001');

    expect(record?.jev).toHaveLength(PASSENGERS_PER_SHIFT);
    expect(record?.human).toEqual(Array.from({ length: PASSENGERS_PER_SHIFT }, () => null));
    expect(record?.seed).toBe('seed0001');
    expect(record?.airport).toBe('ぼくの空港');
    expect(record?.startedAt).toBe(clock.now().toISOString());
  });

  it('空の空港名は invalid_airport', async () => {
    await expect(usecases.startShift({ airport: '   ' })).rejects.toThrow(AppError);
    await expect(usecases.startShift({ airport: '   ' })).rejects.toMatchObject({
      code: 'invalid_airport',
    });
  });

  it('21 文字以上の空港名は airport_too_long', async () => {
    await expect(usecases.startShift({ airport: 'あ'.repeat(21) })).rejects.toMatchObject({
      code: 'airport_too_long',
    });
  });

  it('NG ワードを含む空港名は伏せ字で保存する', async () => {
    await usecases.startShift({ airport: 'shit空港' });
    expect(shifts.records.get('shift001')?.airport).toBe('◯◯空港');
  });

  it('Jev が一部失敗しても続行し、失敗数を返す', async () => {
    build({ judge: new FakeJudge({ failAt: [2, 7] }) });
    const response = await usecases.startShift({ airport: 'ぼくの空港' });

    expect(response.jev.failed).toBe(2);
    expect(shifts.records.get('shift001')?.jev[2]?.decision.kind).toBe('unavailable');
    expect(shifts.records.get('shift001')?.jev[0]?.decision.kind).toBe('decided');
  });

  it('合計時間は並列実行の壁時計時間として最大レイテンシ以上になる', async () => {
    const response = await usecases.startShift({ airport: 'ぼくの空港' });
    expect(response.jev.totalMs).toBeGreaterThanOrEqual(
      Math.max(...response.jev.perPassengerMs),
    );
  });
});

describe('servePassenger', () => {
  beforeEach(async () => {
    await usecases.startShift({ airport: 'ぼくの空港' });
  });

  it('シードから再生成した Dossier を返す', async () => {
    const response = await usecases.servePassenger({ shiftId: 'shift001', index: 3 });
    const expected = generatePassenger('seed0001' as Seed, 3 as PassengerIndex);

    expect(response.dossier).toEqual(expected.dossier);
    expect(response.decided).toBe(false);
  });

  it('真実を一切含まない', async () => {
    const response = await usecases.servePassenger({ shiftId: 'shift001', index: 0 });
    const text = JSON.stringify(response);
    for (const leak of ['isThreat', 'keySignals', 'threatType']) {
      expect(text).not.toContain(leak);
    }
  });

  it('判定済みなら decided を立てる', async () => {
    await usecases.submitVerdict({ shiftId: 'shift001', index: 0, decision: decision() });
    const response = await usecases.servePassenger({ shiftId: 'shift001', index: 0 });
    expect(response.decided).toBe(true);
  });

  it('存在しないシフトは shift_not_found', async () => {
    await expect(usecases.servePassenger({ shiftId: 'nope', index: 0 })).rejects.toMatchObject({
      code: 'shift_not_found',
    });
  });

  it('範囲外の乗客番号は passenger_not_found', async () => {
    for (const index of [-1, 10, 1.5]) {
      await expect(usecases.servePassenger({ shiftId: 'shift001', index })).rejects.toMatchObject({
        code: 'passenger_not_found',
      });
    }
  });
});

describe('submitVerdict', () => {
  beforeEach(async () => {
    await usecases.startShift({ airport: 'ぼくの空港' });
  });

  it('判定を記録して Reveal を返す', async () => {
    const result = await usecases.submitVerdict({
      shiftId: 'shift001',
      index: 0,
      decision: decision({ verdict: 'detain', inspected: ['identity', 'mouth'] }),
    });
    const expected = generatePassenger('seed0001' as Seed, 0 as PassengerIndex);

    expect(result.kind).toBe('recorded');
    expect(result.reveal.truth).toEqual(expected.truth);
    expect(result.reveal.human.verdict).toBe('detain');
    expect(result.reveal.human.inspected).toEqual(['identity', 'mouth']);
    expect(shifts.records.get('shift001')?.human[0]).not.toBeNull();
  });

  it('シフトに封印された Jev の判定を突き合わせる', async () => {
    const result = await usecases.submitVerdict({
      shiftId: 'shift001',
      index: 0,
      decision: decision(),
    });
    expect(result.reveal.jev.decision).toEqual(shifts.records.get('shift001')?.jev[0]?.decision);
    expect(result.reveal.jev.latencyMs).toBe(shifts.records.get('shift001')?.jev[0]?.latencyMs);
  });

  it('2 回目の送信は 1 回目の結果を返し、記録を上書きしない', async () => {
    const first = await usecases.submitVerdict({
      shiftId: 'shift001',
      index: 0,
      decision: decision({ verdict: 'detain' }),
    });
    const second = await usecases.submitVerdict({
      shiftId: 'shift001',
      index: 0,
      decision: decision({ verdict: 'pass', elapsedMs: 1 }),
    });

    expect(second.kind).toBe('already');
    expect(second.reveal).toEqual(first.reveal);
    expect(shifts.records.get('shift001')?.human[0]?.verdict).toBe('detain');
  });

  it('存在しないシフトと範囲外の乗客番号を弾く', async () => {
    await expect(
      usecases.submitVerdict({ shiftId: 'nope', index: 0, decision: decision() }),
    ).rejects.toMatchObject({ code: 'shift_not_found' });
    await expect(
      usecases.submitVerdict({ shiftId: 'shift001', index: 10, decision: decision() }),
    ).rejects.toMatchObject({ code: 'passenger_not_found' });
  });

  it('Jev が判定できなかった乗客でも Reveal を返す', async () => {
    build({ judge: new FakeJudge({ failAt: [0] }) });
    await usecases.startShift({ airport: 'ぼくの空港' });
    const result = await usecases.submitVerdict({
      shiftId: 'shift001' as ShiftId,
      index: 0,
      decision: decision(),
    });

    expect(result.reveal.jev.outcome).toBe('unavailable');
    expect(result.reveal.jev.points).toBe(0);
  });
});
