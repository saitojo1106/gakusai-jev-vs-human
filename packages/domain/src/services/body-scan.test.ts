import { describe, expect, it } from 'vitest';
import { signalOf } from '../content/signals.js';
import type { PassengerIndex, Seed } from '../types.js';
import { toJudgeState } from './judge-state.js';
import { generatePassenger } from './passenger-generator.js';

const seed = 'body-scan' as Seed;
const at = (n: number) => n as PassengerIndex;

describe('X 線検査の所見', () => {
  it('Dossier ではなく Passenger 直下に置かれる', () => {
    const passenger = generatePassenger(seed, at(0));
    expect(passenger.bodyScan.finding).toBeDefined();
    expect(passenger.dossier).not.toHaveProperty('bodyScan');
  });

  it('Jev に渡す state には含まれない', () => {
    for (let i = 0; i < 100; i += 1) {
      const text = JSON.stringify(toJudgeState(generatePassenger(seed, at(i)).dossier));
      for (const leak of ['bodyScan', 'dense_object', 'organic_mass']) {
        expect(text).not.toContain(leak);
      }
    }
  });

  it('シグナルが付いた乗客だけ体内に異常が出る', () => {
    const anomaly = signalOf('body_scan_anomaly');
    if (anomaly === undefined) throw new Error('signal missing');

    for (let i = 0; i < 300; i += 1) {
      const passenger = generatePassenger(seed, at(i));
      const flagged = passenger.truth.keySignals.includes(anomaly.id);
      const finding = passenger.bodyScan.finding;

      if (flagged) {
        expect(['dense_object', 'organic_mass']).toContain(finding);
      } else {
        expect(['clear', 'unreadable']).toContain(finding);
      }
    }
  });

  it('脅威側のほうが体内異常の出る率が高い', () => {
    const passengers = Array.from({ length: 600 }, (_, i) => generatePassenger(seed, at(i)));
    const rate = (threat: boolean) => {
      const group = passengers.filter((p) => p.truth.isThreat === threat);
      const hits = group.filter((p) =>
        ['dense_object', 'organic_mass'].includes(p.bodyScan.finding),
      ).length;
      return hits / group.length;
    };

    expect(rate(true)).toBeGreaterThan(rate(false) * 3);
  });

  it('同じシードなら所見も決定的', () => {
    expect(generatePassenger(seed, at(5)).bodyScan).toEqual(generatePassenger(seed, at(5)).bodyScan);
  });
});
