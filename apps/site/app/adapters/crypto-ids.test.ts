import { describe, expect, it } from 'vitest';
import { CryptoIdGenerator, SystemClock } from './crypto-ids.js';

const ids = new CryptoIdGenerator();

describe('CryptoIdGenerator', () => {
  it('結果 ID は 8 文字の英数字', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(ids.resultId()).toMatch(/^[0-9A-Za-z]{8}$/);
    }
  });

  it('シフト ID は 12 文字の英数字', () => {
    expect(ids.shiftId()).toMatch(/^[0-9A-Za-z]{12}$/);
  });

  it('シードは 16 文字の英数字', () => {
    expect(ids.seed()).toMatch(/^[0-9A-Za-z]{16}$/);
  });

  it('連続して呼んでも衝突しない', () => {
    const generated = Array.from({ length: 5000 }, () => ids.resultId());
    expect(new Set(generated).size).toBe(generated.length);
  });

  it('シードは呼ぶたびに変わる', () => {
    expect(ids.seed()).not.toBe(ids.seed());
  });
});

describe('SystemClock', () => {
  it('現在時刻を返す', () => {
    const before = Date.now();
    const now = new SystemClock().now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});
