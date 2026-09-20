import type { Level, Totals } from '../types.js';

export interface ComparableScore {
  readonly count: number;
  readonly humanPoints: number;
  readonly jevPoints: number;
}

export const judgeLevel = (human: Totals, comparable: ComparableScore): Level => {
  const beatsJev = comparable.count > 0 && comparable.humanPoints > comparable.jevPoints;
  const matchesJev = comparable.count > 0 && comparable.humanPoints >= comparable.jevPoints;
  if (human.missedThreats === 0 && beatsJev) return 5;
  if (matchesJev) return 4;
  if (human.correct >= 8) return 3;
  if (human.correct >= 6) return 2;
  return 1;
};
