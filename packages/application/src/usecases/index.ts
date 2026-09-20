import {
  buildReveal,
  generatePassenger,
  PASSENGERS_PER_SHIFT,
  scoreJudge,
  summarizeShift,
  validateAirportName,
} from '@game/domain';
import type {
  HumanDecision,
  LeaderboardEntry,
  PassengerIndex,
  Reveal,
  ResultId,
  Seed,
  ShiftId,
  ShiftRecord,
  ShiftResult,
  TimedJudgeDecision,
} from '@game/domain';
import { AppError } from '../errors.js';
import type { UsecaseDeps } from '../ports.js';

const RESULT_ID_ATTEMPTS = 8;
const DEFAULT_RANKING_LIMIT = 50;

const unavailable = (reason: string): TimedJudgeDecision => ({
  decision: { kind: 'unavailable', reason },
  latencyMs: 0,
});

const requireShift = async (deps: UsecaseDeps, shiftId: string): Promise<ShiftRecord> => {
  const record = await deps.shifts.get(shiftId as ShiftId);
  if (record === null) throw new AppError('shift_not_found', `no shift ${shiftId}`);
  return record;
};

const requireIndex = (index: number): PassengerIndex => {
  if (!Number.isInteger(index) || index < 0 || index >= PASSENGERS_PER_SHIFT) {
    throw new AppError('passenger_not_found', `passenger ${index} is out of range`);
  }
  return index as PassengerIndex;
};

const revealFor = (record: ShiftRecord, index: PassengerIndex, human: HumanDecision): Reveal =>
  buildReveal(
    generatePassenger(record.seed, index),
    human,
    record.jev[index] ?? unavailable('missing judgement'),
  );

export interface SubmitVerdictOutcome {
  readonly kind: 'recorded' | 'already';
  readonly reveal: Reveal;
}

export const createUsecases = (deps: UsecaseDeps) => {
  const resultUrl = (resultId: ResultId): string => `${deps.publicOrigin}/r/${resultId}`;

  const freeResultId = async (): Promise<ResultId> => {
    for (let attempt = 0; attempt < RESULT_ID_ATTEMPTS; attempt += 1) {
      const candidate = deps.ids.resultId();
      if ((await deps.results.get(candidate)) === null) return candidate;
    }
    throw new AppError('result_not_found', 'could not allocate a free result id');
  };

  return {
    startShift: async (input: { airport: string }) => {
      const airport = validateAirportName(input.airport);
      if (typeof airport !== 'string') {
        throw new AppError(
          airport.error === 'too_long' ? 'airport_too_long' : 'invalid_airport',
          `airport name rejected: ${airport.error}`,
        );
      }

      const seed = deps.ids.seed() as Seed;
      const shiftId = deps.ids.shiftId();
      const passengers = Array.from({ length: PASSENGERS_PER_SHIFT }, (_, i) =>
        generatePassenger(seed, i as PassengerIndex),
      );

      const batch = await deps.judge.evaluateMany(passengers.map((p) => p.dossier));
      const jev = passengers.map(
        (_, i) => batch.decisions[i] ?? unavailable('missing judgement'),
      );

      await deps.shifts.create({
        shiftId,
        seed,
        airport,
        startedAt: deps.clock.now().toISOString(),
        jev,
        jevWallMs: batch.wallMs,
        human: passengers.map(() => null),
        resultId: null,
      });

      return {
        shiftId,
        jev: {
          perPassengerMs: jev.map((d) => d.latencyMs),
          totalMs: batch.wallMs,
          failed: jev.filter((d) => d.decision.kind === 'unavailable').length,
        },
      };
    },

    servePassenger: async (input: { shiftId: string; index: number }) => {
      const record = await requireShift(deps, input.shiftId);
      const index = requireIndex(input.index);
      return {
        dossier: generatePassenger(record.seed, index).dossier,
        decided: record.human[index] != null,
      };
    },

    submitVerdict: async (input: {
      shiftId: string;
      index: number;
      decision: HumanDecision;
    }): Promise<SubmitVerdictOutcome> => {
      const record = await requireShift(deps, input.shiftId);
      const index = requireIndex(input.index);

      const existing = record.human[index];
      if (existing != null) {
        return { kind: 'already', reveal: revealFor(record, index, existing) };
      }

      const updated = await deps.shifts.recordHuman(record.shiftId, index, input.decision);
      return { kind: 'recorded', reveal: revealFor(updated, index, input.decision) };
    },

    finishShift: async (input: { shiftId: string }) => {
      const record = await requireShift(deps, input.shiftId);
      if (record.resultId !== null) {
        return { resultId: record.resultId, url: resultUrl(record.resultId) };
      }

      const decisions = record.human.slice(0, PASSENGERS_PER_SHIFT);
      if (decisions.length < PASSENGERS_PER_SHIFT || decisions.some((d) => d == null)) {
        throw new AppError('shift_incomplete', 'not every passenger has been decided');
      }

      const reveals = decisions.map((decision, i) =>
        revealFor(record, i as PassengerIndex, decision as HumanDecision),
      );
      const summary = summarizeShift(reveals, record.jevWallMs);
      const resultId = await freeResultId();

      const result: ShiftResult = {
        resultId,
        shiftId: record.shiftId,
        seed: record.seed,
        airport: record.airport,
        finishedAt: deps.clock.now().toISOString(),
        reveals,
        ...summary,
      };

      await deps.results.save(result);

      const entry: LeaderboardEntry = {
        resultId,
        airport: record.airport,
        level: summary.level,
        points: summary.totals.human.points,
        marginOverJev: summary.totals.human.points - summary.totals.jev.points,
        finishedAt: result.finishedAt,
      };
      await deps.leaderboard.add(entry);
      await deps.shifts.attachResult(record.shiftId, resultId);

      return { resultId, url: resultUrl(resultId) };
    },

    getResult: async (input: { resultId: string }): Promise<ShiftResult> => {
      const result = await deps.results.get(input.resultId as ResultId);
      if (result === null) throw new AppError('result_not_found', `no result ${input.resultId}`);
      return result;
    },

    runJevBatch: async (input: { seed: string; from: number; count: number }) => {
      const passengers = Array.from({ length: input.count }, (_, i) =>
        generatePassenger(input.seed as Seed, (input.from + i) as PassengerIndex),
      );
      const batch = await deps.judge.evaluateMany(passengers.map((p) => p.dossier));

      const rows = passengers.map((passenger, i) => {
        const timed = batch.decisions[i] ?? unavailable('missing judgement');
        const scored = scoreJudge(passenger.truth, timed.decision);
        return {
          index: input.from + i,
          isThreat: passenger.truth.isThreat,
          verdict: timed.decision.kind === 'decided' ? timed.decision.verdict : null,
          verdictConfidence:
            timed.decision.kind === 'decided' ? timed.decision.verdictConfidence : null,
          outcome: scored.outcome,
          points: scored.points,
          latencyMs: timed.latencyMs,
          reason: timed.decision.kind === 'unavailable' ? timed.decision.reason : null,
        };
      });

      return { rows, wallMs: batch.wallMs };
    },

    getRanking: async (input: { limit?: number; airport?: string }) => {
      const limit = Math.min(Math.max(input.limit ?? DEFAULT_RANKING_LIMIT, 1), 100);
      const airport = input.airport === undefined ? undefined : validateAirportName(input.airport);
      if (airport !== undefined && typeof airport !== 'string') return [];
      return deps.leaderboard.top(limit, airport);
    },
  };
};

export type Usecases = ReturnType<typeof createUsecases>;
