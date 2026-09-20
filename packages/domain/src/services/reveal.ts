import type { HumanDecision, Passenger, Reveal, TimedJudgeDecision } from '../types.js';
import { missedInspections } from './passenger-generator.js';
import { score, scoreJudge } from './scoring.js';

export const buildReveal = (
  passenger: Passenger,
  human: HumanDecision,
  jev: TimedJudgeDecision,
): Reveal => ({
  index: passenger.index,
  truth: passenger.truth,
  human: { ...human, ...score(passenger.truth, human.verdict, human.confidence) },
  jev: { ...jev, ...scoreJudge(passenger.truth, jev.decision) },
  missedByHuman: missedInspections(passenger.truth, human.inspected),
});
