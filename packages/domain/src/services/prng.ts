export interface Prng {
  next(): number;
  int(minInclusive: number, maxExclusive: number): number;
  bool(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  sample<T>(items: readonly T[], count: number): T[];
  shuffle<T>(items: readonly T[]): T[];
}

const hashSeed = (seed: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const createPrng = (seed: string): Prng => {
  let state = hashSeed(seed);

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (minInclusive: number, maxExclusive: number): number => {
    const span = maxExclusive - minInclusive;
    if (span <= 0) return minInclusive;
    return minInclusive + Math.floor(next() * span);
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(0, i + 1);
      [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
    }
    return copy;
  };

  return {
    next,
    int,
    bool: (probability) => next() < probability,
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('pick: empty array');
      return items[int(0, items.length)] as T;
    },
    sample: <T>(items: readonly T[], count: number): T[] =>
      shuffle(items).slice(0, Math.min(count, items.length)),
    shuffle,
  };
};
