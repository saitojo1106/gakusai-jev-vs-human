import { describe, expect, it } from 'vitest';
import { createPrng } from './prng.js';

const take = (seed: string, n: number): number[] => {
  const rng = createPrng(seed);
  return Array.from({ length: n }, () => rng.next());
};

describe('createPrng', () => {
  it('同じシードからは同じ数列が出る', () => {
    expect(take('seed-a', 20)).toEqual(take('seed-a', 20));
  });

  it('異なるシードからは異なる数列が出る', () => {
    expect(take('seed-a', 20)).not.toEqual(take('seed-b', 20));
  });

  it('1 文字違いのシードでも数列が大きく変わる', () => {
    const a = take('shift-0001', 5);
    const b = take('shift-0002', 5);
    expect(a[0]).not.toBeCloseTo(b[0] as number, 3);
  });

  it('next は 0 以上 1 未満を返す', () => {
    for (const v of take('range', 500)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int は下限以上・上限未満の整数を返す', () => {
    const rng = createPrng('int');
    for (let i = 0; i < 500; i += 1) {
      const v = rng.int(3, 7);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(7);
    }
  });

  it('int は上限と下限が同じなら常にその値を返す', () => {
    const rng = createPrng('int-same');
    expect(rng.int(5, 5)).toBe(5);
  });

  it('bool(0) は常に false、bool(1) は常に true', () => {
    const rng = createPrng('bool-edge');
    for (let i = 0; i < 100; i += 1) {
      expect(rng.bool(0)).toBe(false);
      expect(rng.bool(1)).toBe(true);
    }
  });

  it('bool(p) の出現率はおおむね p に一致する', () => {
    const rng = createPrng('bool-dist');
    const hits = Array.from({ length: 10_000 }, () => rng.bool(0.3)).filter(Boolean).length;
    expect(hits / 10_000).toBeCloseTo(0.3, 1);
  });

  it('pick は配列の要素を返す', () => {
    const rng = createPrng('pick');
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i += 1) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('sample は重複なく指定数を返す', () => {
    const rng = createPrng('sample');
    const items = [1, 2, 3, 4, 5];
    const got = rng.sample(items, 3);
    expect(got).toHaveLength(3);
    expect(new Set(got).size).toBe(3);
    for (const v of got) expect(items).toContain(v);
  });

  it('sample は要素数を超えて要求されたら全件を返す', () => {
    const rng = createPrng('sample-over');
    expect(rng.sample([1, 2], 5)).toHaveLength(2);
  });

  it('shuffle は元配列を変更せず並べ替えた配列を返す', () => {
    const rng = createPrng('shuffle');
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const got = rng.shuffle(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...got].sort((a, b) => a - b)).toEqual(items);
  });

  it('同じシードの 2 つのインスタンスは同じ判断列を生む', () => {
    const a = createPrng('twin');
    const b = createPrng('twin');
    expect(a.sample([1, 2, 3, 4, 5], 2)).toEqual(b.sample([1, 2, 3, 4, 5], 2));
    expect(a.bool(0.5)).toBe(b.bool(0.5));
  });
});
