import type { LeaderboardStore } from '@game/application';
import { leaderboardSchema } from '@game/contracts';
import { LEADERBOARD_SIZE } from '@game/domain';
import type { AirportName, LeaderboardEntry } from '@game/domain';
import { parseOrNull } from './kv-json.js';

export const BOARD_KEY = 'board:top';
export const MAX_BOARD_ENTRIES = LEADERBOARD_SIZE;

const byRank = (a: LeaderboardEntry, b: LeaderboardEntry): number =>
  b.points - a.points || Date.parse(b.finishedAt) - Date.parse(a.finishedAt);

export class KvLeaderboard implements LeaderboardStore {
  constructor(private readonly kv: KVNamespace) {}

  private async all(): Promise<readonly LeaderboardEntry[]> {
    return parseOrNull(leaderboardSchema, await this.kv.get(BOARD_KEY)) ?? [];
  }

  async add(entry: LeaderboardEntry): Promise<void> {
    const next = [...(await this.all()), entry].sort(byRank).slice(0, MAX_BOARD_ENTRIES);
    await this.kv.put(BOARD_KEY, JSON.stringify(next));
  }

  async top(limit: number, airport?: AirportName): Promise<readonly LeaderboardEntry[]> {
    const entries = await this.all();
    const filtered = airport === undefined ? entries : entries.filter((e) => e.airport === airport);
    return filtered.slice(0, limit);
  }
}
