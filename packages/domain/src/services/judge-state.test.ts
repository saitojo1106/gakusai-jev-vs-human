import { describe, expect, it } from 'vitest';
import type { PassengerIndex, Seed } from '../types.js';
import { generatePassenger } from './passenger-generator.js';
import { toJudgeState } from './judge-state.js';

const seed = 'judge-state' as Seed;
const passengerAt = (n: number) => generatePassenger(seed, n as PassengerIndex);

describe('toJudgeState', () => {
  it('Truth の語をひとつも含まない', () => {
    for (let i = 0; i < 50; i += 1) {
      const text = JSON.stringify(toJudgeState(passengerAt(i).dossier));
      for (const leak of ['isThreat', 'threatType', 'keySignals', 'hijack']) {
        expect(text).not.toContain(leak);
      }
    }
  });

  it('同じ Dossier からは同じ state が出る', () => {
    const { dossier } = passengerAt(0);
    expect(toJudgeState(dossier)).toEqual(toJudgeState(dossier));
  });

  it('人間が見られる項目をすべて渡す', () => {
    const { dossier } = passengerAt(0);
    const state = toJudgeState(dossier);
    for (const key of [
      'appearance',
      'identityDocument',
      'boardingPass',
      'belongings',
      'travelPurpose',
      'interview',
      'mouthInspection',
      'backgroundCheck',
      'residenceHistory',
    ]) {
      expect(state).toHaveProperty(key);
    }
  });

  it('質問と回答は人間が読むテキストのまま渡す', () => {
    const { dossier } = passengerAt(3);
    const state = toJudgeState(dossier) as { interview: { question: string; answer: string }[] };
    expect(state.interview).toHaveLength(dossier.interview.length);
    for (const [i, exchange] of dossier.interview.entries()) {
      expect(state.interview[i]?.question).toBe(exchange.question);
      expect(state.interview[i]?.answer).toBe(exchange.answer);
    }
  });

  it('精査所見と手荷物のフラグを落とさない', () => {
    for (let i = 0; i < 50; i += 1) {
      const { dossier } = passengerAt(i);
      const state = toJudgeState(dossier) as {
        identityDocument: { forgeryObservations: readonly string[] };
        belongings: readonly { flags: readonly string[] }[];
      };
      expect(state.identityDocument.forgeryObservations).toEqual(dossier.identity.inspection);
      expect(state.belongings.map((b) => b.flags)).toEqual(
        dossier.belongings.map((b) => [...b.flags]),
      );
    }
  });

  it('居住国は治安区分つきで渡す', () => {
    const { dossier } = passengerAt(5);
    const state = toJudgeState(dossier) as {
      residenceHistory: readonly { country: string; years: number; stability: string }[];
    };
    expect(state.residenceHistory).toHaveLength(dossier.residenceHistory.length);
    expect(state.residenceHistory[0]?.stability).toBe(dossier.residenceHistory[0]?.stability);
  });

  it('JSON にそのまま載せられる', () => {
    const state = toJudgeState(passengerAt(0).dossier);
    expect(() => JSON.stringify(state)).not.toThrow();
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
