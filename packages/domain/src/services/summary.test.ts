import { describe, expect, it } from 'vitest';
import type { AspectId, Confidence, Outcome, PassengerIndex, Reveal } from '../types.js';
import { summarizeShift } from './summary.js';

const aspects: Readonly<Record<AspectId, number>> = {
  documents: 0.5,
  belongings: 0.5,
  interview: 0.5,
  body: 0.5,
  background: 0.5,
};

const scoredOf = (outcome: Outcome) => {
  const points: Record<Outcome, number> = {
    correct_pass: 10,
    correct_detain: 30,
    false_detain: -10,
    missed_threat: -50,
    unavailable: 0,
  };
  return {
    outcome,
    points: points[outcome],
    hijackOccurred: outcome === 'missed_threat',
  };
};

const reveal = (
  index: number,
  humanOutcome: Outcome,
  jevOutcome: Outcome,
  elapsedMs = 1000,
): Reveal => ({
  index: index as PassengerIndex,
  truth: { isThreat: humanOutcome === 'correct_detain' || humanOutcome === 'missed_threat', threatType: 'none', keySignals: [] },
  human: {
    verdict: humanOutcome === 'correct_detain' || humanOutcome === 'false_detain' ? 'detain' : 'pass',
    confidence: 0.5 as Confidence,
    elapsedMs,
    inspected: [],
    ...scoredOf(humanOutcome),
  },
  jev: {
    decision:
      jevOutcome === 'unavailable'
        ? { kind: 'unavailable', reason: 'timeout' }
        : {
            kind: 'decided',
            verdict: jevOutcome === 'correct_detain' || jevOutcome === 'false_detain' ? 'detain' : 'pass',
            threatProbability: 0.5,
            suspicion: 2,
            aspects,
          },
    latencyMs: 200,
    ...scoredOf(jevOutcome),
  },
  missedByHuman: [],
});

describe('summarizeShift', () => {
  it('人間と Jev の合計点・正答数・見逃し・誤検知を集計する', () => {
    const reveals = [
      reveal(0, 'correct_pass', 'correct_pass'),
      reveal(1, 'correct_detain', 'false_detain'),
      reveal(2, 'missed_threat', 'correct_detain'),
      reveal(3, 'false_detain', 'correct_pass'),
    ];
    const { totals } = summarizeShift(reveals, 830);

    expect(totals.human).toEqual({
      points: 10 + 30 - 50 - 10,
      correct: 2,
      missedThreats: 1,
      falseDetains: 1,
      elapsedMs: 4000,
    });
    expect(totals.jev).toEqual({
      points: 10 - 10 + 30 + 10,
      correct: 3,
      missedThreats: 0,
      falseDetains: 1,
      elapsedMs: 830,
    });
  });

  it('人間の所要時間は合計、Jev は並列実行の壁時計時間を使う', () => {
    const { totals } = summarizeShift([reveal(0, 'correct_pass', 'correct_pass', 90_000)], 830);
    expect(totals.human.elapsedMs).toBe(90_000);
    expect(totals.jev.elapsedMs).toBe(830);
  });

  it('得点が高い方を勝者にする', () => {
    expect(summarizeShift([reveal(0, 'correct_detain', 'missed_threat')], 800).winner).toBe('human');
    expect(summarizeShift([reveal(0, 'missed_threat', 'correct_detain')], 800).winner).toBe('jev');
  });

  it('同点なら引き分け', () => {
    expect(summarizeShift([reveal(0, 'correct_pass', 'correct_pass')], 800).winner).toBe('draw');
  });

  it('判定不能の乗客は Jev の正答にも見逃しにも数えず 0 点にする', () => {
    const { totals } = summarizeShift(
      [reveal(0, 'correct_pass', 'unavailable'), reveal(1, 'correct_pass', 'correct_pass')],
      800,
    );
    expect(totals.jev).toEqual({
      points: 10,
      correct: 1,
      missedThreats: 0,
      falseDetains: 0,
      elapsedMs: 800,
    });
  });

  it('Jev が判定できなかった乗客を除いて勝敗を決める', () => {
    const reveals = [
      reveal(0, 'correct_detain', 'unavailable'),
      reveal(1, 'correct_pass', 'correct_pass'),
    ];
    expect(summarizeShift(reveals, 800).winner).toBe('draw');
  });

  it('レベル認定まで返す', () => {
    const reveals = Array.from({ length: 10 }, (_, i) => reveal(i, 'correct_pass', 'false_detain'));
    const summary = summarizeShift(reveals, 800);
    expect(summary.level).toBe(5);
    expect(summary.winner).toBe('human');
  });

  it('乗客が 0 人でも落ちない', () => {
    const summary = summarizeShift([], 0);
    expect(summary.totals.human.points).toBe(0);
    expect(summary.winner).toBe('draw');
    expect(summary.level).toBe(1);
  });
});
