import { describe, expect, it } from 'vitest';
import type {
  AspectId,
  Confidence,
  HumanDecision,
  JudgeDecision,
  PassengerIndex,
  Seed,
  TimedJudgeDecision,
} from '../types.js';
import { generatePassenger } from './passenger-generator.js';
import { buildReveal } from './reveal.js';

const seed = 'reveal' as Seed;

const aspects: Readonly<Record<AspectId, number>> = {
  documents: 0.8,
  belongings: 0.6,
  interview: 0.3,
  body: 0.2,
  background: 0.1,
};

const timed = (decision: JudgeDecision, latencyMs = 210): TimedJudgeDecision => ({
  decision,
  latencyMs,
});

const human = (over: Partial<HumanDecision> = {}): HumanDecision => ({
  verdict: 'detain',
  confidence: 0.8 as Confidence,
  elapsedMs: 30_000,
  inspected: [],
  ...over,
});

const threatAt = (from: number): number => {
  for (let i = from; i < 200; i += 1) {
    if (generatePassenger(seed, i as PassengerIndex).truth.isThreat) return i;
  }
  throw new Error('no threat passenger found');
};

describe('buildReveal', () => {
  it('乗客番号と真実をそのまま載せる', () => {
    const passenger = generatePassenger(seed, 0 as PassengerIndex);
    const reveal = buildReveal(
      passenger,
      human(),
      timed({ kind: 'decided', verdict: 'pass', verdictConfidence: 0.8, threatProbability: 0.2, suspicion: 1, aspects }),
    );
    expect(reveal.index).toBe(passenger.index);
    expect(reveal.truth).toEqual(passenger.truth);
  });

  it('人間と Jev の両方を採点する', () => {
    const passenger = generatePassenger(seed, threatAt(0) as PassengerIndex);
    const reveal = buildReveal(
      passenger,
      human({ verdict: 'pass' }),
      timed({ kind: 'decided', verdict: 'detain', verdictConfidence: 0.9, threatProbability: 0.9, suspicion: 3, aspects }),
    );
    expect(reveal.human.outcome).toBe('missed_threat');
    expect(reveal.human.hijackOccurred).toBe(true);
    expect(reveal.jev.outcome).toBe('correct_detain');
    expect(reveal.jev.latencyMs).toBe(210);
  });

  it('人間の判定内容を保持する', () => {
    const passenger = generatePassenger(seed, 0 as PassengerIndex);
    const decision = human({ inspected: ['identity', 'mouth'], elapsedMs: 12_345 });
    const reveal = buildReveal(passenger, decision, timed({ kind: 'unavailable', reason: 'timeout' }));
    expect(reveal.human.inspected).toEqual(['identity', 'mouth']);
    expect(reveal.human.elapsedMs).toBe(12_345);
    expect(reveal.jev.outcome).toBe('unavailable');
  });

  it('決め手を調べていなければ見落としとして挙げる', () => {
    const index = threatAt(0);
    const passenger = generatePassenger(seed, index as PassengerIndex);
    const reveal = buildReveal(passenger, human({ inspected: [] }), timed({ kind: 'unavailable', reason: 'x' }));
    expect(reveal.missedByHuman.length).toBeGreaterThan(0);
  });

  it('決め手を 1 つでも開いていればその項目は挙げない', () => {
    const index = threatAt(0);
    const passenger = generatePassenger(seed, index as PassengerIndex);
    const everything = buildReveal(
      passenger,
      human({
        inspected: [
          'identity',
          'boarding_pass',
          'belongings',
          'passport_inspection',
          'mouth',
          'record',
          'residence',
          'question:purpose',
          'question:occupation',
          'question:bag_contents',
          'question:who_packed',
          'question:accommodation',
          'question:follow_up',
        ],
      }),
      timed({ kind: 'unavailable', reason: 'x' }),
    );
    expect(everything.missedByHuman).toEqual([]);
  });
});
