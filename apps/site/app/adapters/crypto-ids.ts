import type { Clock, IdGenerator } from '@game/application';
import type { ResultId, Seed, ShiftId } from '@game/domain';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const randomId = (length: number): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
};

export class CryptoIdGenerator implements IdGenerator {
  shiftId(): ShiftId {
    return randomId(12) as ShiftId;
  }

  resultId(): ResultId {
    return randomId(8) as ResultId;
  }

  seed(): Seed {
    return randomId(16) as Seed;
  }
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
