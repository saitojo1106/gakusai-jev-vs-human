import type { LeaderboardStore } from '@game/application';
import { leaderboardEntrySchema } from '@game/contracts';
import type { AirportName, LeaderboardEntry } from '@game/domain';
import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { leaderboard } from '../db/schema.js';
import { validateOrNull } from './validate.js';

export class D1Leaderboard implements LeaderboardStore {
  private readonly db: DrizzleD1Database;

  constructor(d1: D1Database) {
    this.db = drizzle(d1);
  }

  async add(entry: LeaderboardEntry): Promise<void> {
    await this.db
      .insert(leaderboard)
      .values({
        resultId: entry.resultId,
        airport: entry.airport,
        level: entry.level,
        points: entry.points,
        marginOverJev: entry.marginOverJev,
        finishedAt: entry.finishedAt,
      })
      .onConflictDoNothing();
  }

  async top(limit: number, airport?: AirportName): Promise<readonly LeaderboardEntry[]> {
    const rows = await this.db
      .select()
      .from(leaderboard)
      .where(airport === undefined ? undefined : eq(leaderboard.airport, airport))
      .orderBy(desc(leaderboard.points), desc(leaderboard.finishedAt))
      .limit(limit);

    return rows.flatMap((row) => {
      const entry = validateOrNull(leaderboardEntrySchema, row);
      return entry === null ? [] : [entry];
    });
  }
}
