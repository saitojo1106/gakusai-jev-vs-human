import { AppError } from '@game/application';
import type { ShiftStore } from '@game/application';
import { shiftRecordSchema } from '@game/contracts';
import type { HumanDecision, PassengerIndex, ResultId, ShiftId, ShiftRecord } from '@game/domain';
import { parseOrNull } from './kv-json.js';

export const SHIFT_TTL_SECONDS = 86_400;

const key = (id: ShiftId | string): string => `shift:${id}`;

export class KvShiftStore implements ShiftStore {
  constructor(
    private readonly kv: KVNamespace,
    private readonly ttlSeconds: number = SHIFT_TTL_SECONDS,
  ) {}

  async create(record: ShiftRecord): Promise<void> {
    await this.kv.put(key(record.shiftId), JSON.stringify(record), {
      expirationTtl: this.ttlSeconds,
    });
  }

  async get(id: ShiftId): Promise<ShiftRecord | null> {
    return parseOrNull(shiftRecordSchema, await this.kv.get(key(id)));
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
    const current = await this.require(id);
    if (current.human[index] != null) {
      throw new AppError('already_decided', `passenger ${index} already decided`);
    }
    const human = [...current.human];
    human[index] = decision;
    const next: ShiftRecord = { ...current, human };
    await this.create(next);
    return next;
  }

  async attachResult(id: ShiftId, resultId: ResultId): Promise<ShiftRecord> {
    const next: ShiftRecord = { ...(await this.require(id)), resultId };
    await this.create(next);
    return next;
  }
}
