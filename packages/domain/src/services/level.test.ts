import { describe, expect, it } from 'vitest';
import type { Totals } from '../types.js';
import { judgeLevel } from './level.js';

const totals = (over: Partial<Totals> = {}): Totals => ({
  points: 0,
  correct: 0,
  missedThreats: 0,
  falseDetains: 0,
  elapsedMs: 0,
  ...over,
});

const comparable = (humanPoints: number, jevPoints: number, count = 10) => ({
  count,
  humanPoints,
  jevPoints,
});

describe('judgeLevel', () => {
  it('見逃し 0 かつ Jev より高得点なら Lv.5', () => {
    expect(judgeLevel(totals({ correct: 10, missedThreats: 0 }), comparable(160, 120))).toBe(5);
  });

  it('Jev より 1 点でも高ければ Lv.5 の得点条件を満たす', () => {
    expect(judgeLevel(totals({ correct: 9, missedThreats: 0 }), comparable(121, 120))).toBe(5);
  });

  it('見逃しがあれば Jev に勝っても Lv.4 止まり', () => {
    expect(judgeLevel(totals({ correct: 9, missedThreats: 1 }), comparable(160, 120))).toBe(4);
  });

  it('Jev と同点なら Lv.4', () => {
    expect(judgeLevel(totals({ correct: 7, missedThreats: 1 }), comparable(120, 120))).toBe(4);
  });

  it('見逃し 0 でも Jev と同点なら Lv.4', () => {
    expect(judgeLevel(totals({ correct: 10, missedThreats: 0 }), comparable(120, 120))).toBe(4);
  });

  it('Jev に負けていても正答 8 人以上なら Lv.3', () => {
    expect(judgeLevel(totals({ correct: 8 }), comparable(100, 120))).toBe(3);
  });

  it('正答 7 人なら Lv.2', () => {
    expect(judgeLevel(totals({ correct: 7 }), comparable(100, 120))).toBe(2);
  });

  it('正答 6 人なら Lv.2', () => {
    expect(judgeLevel(totals({ correct: 6 }), comparable(100, 120))).toBe(2);
  });

  it('正答 5 人以下なら Lv.1', () => {
    expect(judgeLevel(totals({ correct: 5 }), comparable(100, 120))).toBe(1);
    expect(judgeLevel(totals({ correct: 0 }), comparable(100, 120))).toBe(1);
  });

  it('Jev との比較は判定不能分を除いた共通の乗客だけで行う', () => {
    const human = totals({ correct: 8, missedThreats: 0, points: 200 });
    expect(judgeLevel(human, comparable(150, 160, 8))).toBe(3);
    expect(judgeLevel(human, comparable(170, 160, 8))).toBe(5);
  });

  it('Jev が 1 人も判定できなかったら正答数だけでレベルを決める', () => {
    expect(judgeLevel(totals({ correct: 10, missedThreats: 0 }), comparable(0, 0, 0))).toBe(3);
    expect(judgeLevel(totals({ correct: 4 }), comparable(0, 0, 0))).toBe(1);
  });
});
