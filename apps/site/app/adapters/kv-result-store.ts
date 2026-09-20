import type { ResultStore } from '@game/application';
import { shiftResultSchema } from '@game/contracts';
import type { ResultId, ShiftResult } from '@game/domain';
import { parseOrNull } from './kv-json.js';

const key = (id: ResultId | string): string => `result:${id}`;

export class KvResultStore implements ResultStore {
  constructor(private readonly kv: KVNamespace) {}

  async save(result: ShiftResult): Promise<void> {
    await this.kv.put(key(result.resultId), JSON.stringify(result));
  }

  async get(id: ResultId): Promise<ShiftResult | null> {
    return parseOrNull(shiftResultSchema, await this.kv.get(key(id)));
  }
}
