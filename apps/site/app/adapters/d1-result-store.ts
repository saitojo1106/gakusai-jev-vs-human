import type { ResultStore } from '@game/application';
import { shiftResultSchema } from '@game/contracts';
import type { ResultId, ShiftResult } from '@game/domain';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { results } from '../db/schema.js';
import { parseJsonOrNull, validateOrNull } from './validate.js';

export class D1ResultStore implements ResultStore {
  private readonly db: DrizzleD1Database;

  constructor(d1: D1Database) {
    this.db = drizzle(d1);
  }

  async save(result: ShiftResult): Promise<void> {
    const row = {
      id: result.resultId,
      shiftId: result.shiftId,
      seed: result.seed,
      airport: result.airport,
      finishedAt: result.finishedAt,
      reveals: JSON.stringify(result.reveals),
      totals: JSON.stringify(result.totals),
      winner: result.winner,
      level: result.level,
    };
    await this.db.insert(results).values(row).onConflictDoUpdate({ target: results.id, set: row });
  }

  async get(id: ResultId): Promise<ShiftResult | null> {
    const [row] = await this.db.select().from(results).where(eq(results.id, id)).limit(1);
    if (row === undefined) return null;

    return validateOrNull(shiftResultSchema, {
      resultId: row.id,
      shiftId: row.shiftId,
      seed: row.seed,
      airport: row.airport,
      finishedAt: row.finishedAt,
      reveals: parseJsonOrNull(row.reveals),
      totals: parseJsonOrNull(row.totals),
      winner: row.winner,
      level: row.level,
    });
  }
}
