import type {
  AirportName,
  Dossier,
  HumanDecision,
  LeaderboardEntry,
  PassengerIndex,
  ResultId,
  Seed,
  ShiftId,
  ShiftRecord,
  ShiftResult,
  TimedJudgeDecision,
} from '@game/domain';

export interface JudgeBatch {
  readonly decisions: readonly TimedJudgeDecision[];
  readonly wallMs: number;
}

export interface JudgePort {
  evaluateMany(dossiers: readonly Dossier[]): Promise<JudgeBatch>;
}

export interface ShiftStore {
  create(record: ShiftRecord): Promise<void>;
  get(id: ShiftId): Promise<ShiftRecord | null>;
  recordHuman(
    id: ShiftId,
    index: PassengerIndex,
    decision: HumanDecision,
  ): Promise<ShiftRecord>;
  useXray(id: ShiftId, index: PassengerIndex): Promise<ShiftRecord>;
  attachResult(id: ShiftId, resultId: ResultId): Promise<ShiftRecord>;
}

export interface ResultStore {
  save(result: ShiftResult): Promise<void>;
  get(id: ResultId): Promise<ShiftResult | null>;
}

export interface LeaderboardStore {
  add(entry: LeaderboardEntry): Promise<void>;
  top(limit: number, airport?: AirportName): Promise<readonly LeaderboardEntry[]>;
}

export interface IdGenerator {
  shiftId(): ShiftId;
  resultId(): ResultId;
  seed(): Seed;
}

export interface Clock {
  now(): Date;
}

export interface UsecaseDeps {
  readonly judge: JudgePort;
  readonly shifts: ShiftStore;
  readonly results: ResultStore;
  readonly leaderboard: LeaderboardStore;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly publicOrigin: string;
}
