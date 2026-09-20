import { AppError } from '@game/application';
import type { ShiftStore } from '@game/application';
import { shiftRecordSchema } from '@game/contracts';
import { PASSENGERS_PER_SHIFT } from '@game/domain';
import type { HumanDecision, PassengerIndex, ResultId, ShiftId, ShiftRecord } from '@game/domain';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { decisions, shifts } from '../db/schema.js';
import { parseJsonOrNull, validateOrNull } from './validate.js';

export const SHIFT_TTL_SECONDS = 86_400;

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

export class D1ShiftStore implements ShiftStore {
  private readonly db: DrizzleD1Database;

  constructor(
    d1: D1Database,
    private readonly ttlSeconds: number = SHIFT_TTL_SECONDS,
  ) {
    this.db = drizzle(d1);
  }

  async create(record: ShiftRecord): Promise<void> {
    await this.db.insert(shifts).values({
      id: record.shiftId,
      seed: record.seed,
      airport: record.airport,
      startedAt: record.startedAt,
      jev: JSON.stringify(record.jev),
      jevWallMs: record.jevWallMs,
      xrayUsedOn: record.xrayUsedOn,
      resultId: record.resultId,
      expiresAt: nowSeconds() + this.ttlSeconds,
    });

    const taken = record.human
      .map((decision, idx) => ({ decision, idx }))
      .filter((slot): slot is { decision: HumanDecision; idx: number } => slot.decision !== null);

    if (taken.length > 0) {
      await this.db.insert(decisions).values(
        taken.map(({ decision, idx }) => ({
          shiftId: record.shiftId,
          idx,
          decision: JSON.stringify(decision),
        })),
      );
    }
  }

  async get(id: ShiftId): Promise<ShiftRecord | null> {
    const [row] = await this.db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, id), gt(shifts.expiresAt, nowSeconds())))
      .limit(1);
    if (row === undefined) return null;

    const taken = await this.db.select().from(decisions).where(eq(decisions.shiftId, id));
    const human: unknown[] = Array.from({ length: PASSENGERS_PER_SHIFT }, () => null);
    for (const slot of taken) human[slot.idx] = parseJsonOrNull(slot.decision);

    return validateOrNull(shiftRecordSchema, {
      shiftId: row.id,
      seed: row.seed,
      airport: row.airport,
      startedAt: row.startedAt,
      jev: parseJsonOrNull(row.jev),
      jevWallMs: row.jevWallMs,
      human,
      xrayUsedOn: row.xrayUsedOn,
      resultId: row.resultId,
    });
  }

  private async require(id: ShiftId): Promise<ShiftRecord> {
    const record = await this.get(id);
    if (record === null) throw new AppError('shift_not_found', `no shift ${id}`);
    return record;
  }

  async recordHuman(
    id: ShiftId,
    index: PassengerIndex,
    decision: HumanDecision,
  ): Promise<ShiftRecord> {
    await this.require(id);

    const inserted = await this.db
      .insert(decisions)
      .values({ shiftId: id, idx: index, decision: JSON.stringify(decision) })
      .onConflictDoNothing()
      .returning({ idx: decisions.idx });

    if (inserted.length === 0) {
      throw new AppError('already_decided', `passenger ${index} already decided`);
    }
    return this.require(id);
  }

  async useXray(id: ShiftId, index: PassengerIndex): Promise<ShiftRecord> {
    const claimed = await this.db
      .update(shifts)
      .set({ xrayUsedOn: index })
      .where(
        and(eq(shifts.id, id), gt(shifts.expiresAt, nowSeconds()), isNull(shifts.xrayUsedOn)),
      )
      .returning({ id: shifts.id });

    if (claimed.length === 0) {
      await this.require(id);
      throw new AppError('xray_used', 'the x-ray has already been used in this shift');
    }
    return this.require(id);
  }

  async attachResult(id: ShiftId, resultId: ResultId): Promise<ShiftRecord> {
    await this.require(id);
    await this.db.update(shifts).set({ resultId }).where(eq(shifts.id, id));
    return this.require(id);
  }
}
