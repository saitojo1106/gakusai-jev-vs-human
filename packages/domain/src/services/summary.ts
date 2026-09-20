import type { Reveal, Scored, ShiftResult, Totals } from '../types.js';
import { type ComparableScore, judgeLevel } from './level.js';

const sum = (values: readonly number[]): number => values.reduce((acc, v) => acc + v, 0);

const countOf = (scores: readonly Scored[], ...outcomes: readonly Scored['outcome'][]): number =>
  scores.filter((s) => outcomes.includes(s.outcome)).length;

const totalsOf = (scores: readonly Scored[], elapsedMs: number): Totals => ({
  points: sum(scores.map((s) => s.points)),
  correct: countOf(scores, 'correct_pass', 'correct_detain'),
  missedThreats: countOf(scores, 'missed_threat'),
  falseDetains: countOf(scores, 'false_detain'),
  elapsedMs,
});

export const summarizeShift = (
  reveals: readonly Reveal[],
  jevWallMs: number,
): Pick<ShiftResult, 'totals' | 'winner' | 'level'> => {
  const human = totalsOf(
    reveals.map((r) => r.human),
    sum(reveals.map((r) => r.human.elapsedMs)),
  );
  const jev = totalsOf(
    reveals.map((r) => r.jev),
    jevWallMs,
  );

  const shared = reveals.filter((r) => r.jev.outcome !== 'unavailable');
  const comparable: ComparableScore = {
    count: shared.length,
    humanPoints: sum(shared.map((r) => r.human.points)),
    jevPoints: sum(shared.map((r) => r.jev.points)),
  };

  const winner =
    comparable.humanPoints === comparable.jevPoints
      ? 'draw'
      : comparable.humanPoints > comparable.jevPoints
        ? 'human'
        : 'jev';

  return { totals: { human, jev }, winner, level: judgeLevel(human, comparable) };
};
