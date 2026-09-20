import type {
  AirportName,
  HumanDecision,
  LeaderboardEntry,
  PassengerIndex,
  ResultId,
  Seed,
  ShiftId,
  ShiftRecord,
  ShiftResult,
} from '@game/domain';
import { AppError } from '../errors.js';
import type { Clock, IdGenerator, LeaderboardStore, ResultStore, ShiftStore } from '../ports.js';

export class InMemoryShiftStore implements ShiftStore {
  readonly records = new Map<string, ShiftRecord>();

  create(record: ShiftRecord): Promise<void> {
    this.records.set(record.shiftId, record);
    return Promise.resolve();
  }

  get(id: ShiftId): Promise<ShiftRecord | null> {
    return Promise.resolve(this.records.get(id) ?? null);
  }

  recordHuman(id: ShiftId, index: PassengerIndex, decision: HumanDecision): Promise<ShiftRecord> {
    const current = this.records.get(id);
    if (current === undefined) throw new AppError('shift_not_found', `no shift ${id}`);
    if (current.human[index] != null) {
      throw new AppError('already_decided', `passenger ${index} already decided`);
    }
    const human = [...current.human];
    human[index] = decision;
    const next: ShiftRecord = { ...current, human };
    this.records.set(id, next);
    return Promise.resolve(next);
  }

  attachResult(id: ShiftId, resultId: ResultId): Promise<ShiftRecord> {
    const current = this.records.get(id);
    if (current === undefined) throw new AppError('shift_not_found', `no shift ${id}`);
    const next: ShiftRecord = { ...current, resultId };
    this.records.set(id, next);
    return Promise.resolve(next);
  }
}

export class InMemoryResultStore implements ResultStore {
  readonly results = new Map<string, ShiftResult>();

  save(result: ShiftResult): Promise<void> {
    this.results.set(result.resultId, result);
    return Promise.resolve();
  }

  get(id: ResultId): Promise<ShiftResult | null> {
    return Promise.resolve(this.results.get(id) ?? null);
  }
}

export class InMemoryLeaderboard implements LeaderboardStore {
  readonly entries: LeaderboardEntry[] = [];

  add(entry: LeaderboardEntry): Promise<void> {
    this.entries.push(entry);
    return Promise.resolve();
  }

  top(limit: number, airport?: AirportName): Promise<readonly LeaderboardEntry[]> {
    const filtered =
      airport === undefined ? this.entries : this.entries.filter((e) => e.airport === airport);
    const sorted = [...filtered].sort(
      (a, b) => b.points - a.points || Date.parse(b.finishedAt) - Date.parse(a.finishedAt),
    );
    return Promise.resolve(sorted.slice(0, limit));
  }
}

export class FixedClock implements Clock {
  constructor(private current: Date = new Date('2026-09-20T05:00:00.000Z')) {}

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class StubIdGenerator implements IdGenerator {
  private shiftCursor = 0;
  private resultCursor = 0;
  private seedCursor = 0;

  constructor(
    private readonly shiftIds: readonly string[] = ['shift001'],
    private readonly resultIds: readonly string[] = ['result01'],
    private readonly seeds: readonly string[] = ['seed0001'],
  ) {}

  private take(values: readonly string[], cursor: number): string {
    return values[Math.min(cursor, values.length - 1)] ?? 'fallback';
  }

  shiftId(): ShiftId {
    return this.take(this.shiftIds, this.shiftCursor++) as ShiftId;
  }

  resultId(): ResultId {
    return this.take(this.resultIds, this.resultCursor++) as ResultId;
  }

  seed(): Seed {
    return this.take(this.seeds, this.seedCursor++) as Seed;
  }
}
