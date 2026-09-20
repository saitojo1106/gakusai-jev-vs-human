import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const shifts = sqliteTable('shifts', {
  id: text('id').primaryKey(),
  seed: text('seed').notNull(),
  airport: text('airport').notNull(),
  startedAt: text('started_at').notNull(),
  jev: text('jev').notNull(),
  jevWallMs: integer('jev_wall_ms').notNull(),
  xrayUsedOn: integer('xray_used_on'),
  resultId: text('result_id'),
  expiresAt: integer('expires_at').notNull(),
});

export const decisions = sqliteTable(
  'decisions',
  {
    shiftId: text('shift_id')
      .notNull()
      .references(() => shifts.id, { onDelete: 'cascade' }),
    idx: integer('idx').notNull(),
    decision: text('decision').notNull(),
  },
  (table) => [primaryKey({ columns: [table.shiftId, table.idx] })],
);

export const results = sqliteTable('results', {
  id: text('id').primaryKey(),
  shiftId: text('shift_id').notNull(),
  seed: text('seed').notNull(),
  airport: text('airport').notNull(),
  finishedAt: text('finished_at').notNull(),
  reveals: text('reveals').notNull(),
  totals: text('totals').notNull(),
  winner: text('winner').notNull(),
  level: integer('level').notNull(),
});

export const leaderboard = sqliteTable(
  'leaderboard',
  {
    resultId: text('result_id').primaryKey(),
    airport: text('airport').notNull(),
    level: integer('level').notNull(),
    points: integer('points').notNull(),
    marginOverJev: integer('margin_over_jev').notNull(),
    finishedAt: text('finished_at').notNull(),
  },
  (table) => [
    index('leaderboard_rank').on(table.points, table.finishedAt),
    index('leaderboard_airport_rank').on(table.airport, table.points, table.finishedAt),
  ],
);
