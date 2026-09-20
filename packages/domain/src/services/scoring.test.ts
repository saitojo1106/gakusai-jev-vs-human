import { describe, expect, it } from 'vitest';
import type { AspectId, JudgeDecision, Truth } from '../types.js';
import { score, scoreJudge } from './scoring.js';

const threat: Truth = { isThreat: true, threatType: 'hijack', keySignals: [] };
const benign: Truth = { isThreat: false, threatType: 'none', keySignals: [] };

const aspects: Readonly<Record<AspectId, number>> = {
  documents: 0.5,
  belongings: 0.5,
  interview: 0.5,
  body: 0.5,
  background: 0.5,
};

const decided = (
  verdict: 'pass' | 'detain',
  verdictConfidence: number,
  threatProbability = 0.5,
): JudgeDecision => ({
  kind: 'decided',
  verdict,
  verdictConfidence,
  threatProbability,
  suspicion: 2,
  aspects,
});

describe('score', () => {
  it('確信度 50% のときはスコア表どおりの点になる', () => {
    expect(score(benign, 'pass', 0.5)).toEqual({
      outcome: 'correct_pass',
      points: 10,
      hijackOccurred: false,
    });
    expect(score(threat, 'detain', 0.5)).toEqual({
      outcome: 'correct_detain',
      points: 30,
      hijackOccurred: false,
    });
    expect(score(benign, 'detain', 0.5)).toEqual({
      outcome: 'false_detain',
      points: -10,
      hijackOccurred: false,
    });
    expect(score(threat, 'pass', 0.5)).toEqual({
      outcome: 'missed_threat',
      points: -50,
      hijackOccurred: true,
    });
  });

  it('確信度 100% の正解には +10 のボーナスが付く', () => {
    expect(score(benign, 'pass', 1).points).toBe(20);
    expect(score(threat, 'detain', 1).points).toBe(40);
  });

  it('確信度 100% の不正解には −10 の追加減点が付く', () => {
    expect(score(benign, 'detain', 1).points).toBe(-20);
    expect(score(threat, 'pass', 1).points).toBe(-60);
  });

  it('ボーナスは ±10 点の範囲に収まる', () => {
    for (const c of [0.5, 0.6, 0.7, 0.8, 0.9, 1]) {
      expect(Math.abs(score(benign, 'pass', c).points - 10)).toBeLessThanOrEqual(10);
      expect(Math.abs(score(threat, 'pass', c).points + 50)).toBeLessThanOrEqual(10);
    }
  });

  it('正解時は確信度が高いほど点が高い', () => {
    const points = [0.5, 0.6, 0.7, 0.8, 0.9, 1].map((c) => score(threat, 'detain', c).points);
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i] as number).toBeGreaterThan(points[i - 1] as number);
    }
  });

  it('不正解時は確信度が高いほど点が低い', () => {
    const points = [0.5, 0.6, 0.7, 0.8, 0.9, 1].map((c) => score(threat, 'pass', c).points);
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i] as number).toBeLessThan(points[i - 1] as number);
    }
  });

  it('確信度が範囲外でも 0.5〜1.0 に丸めて採点する', () => {
    expect(score(benign, 'pass', 0).points).toBe(10);
    expect(score(benign, 'pass', 2).points).toBe(20);
  });

  it('hijackOccurred は脅威を通過させたときだけ true', () => {
    expect(score(threat, 'pass', 0.8).hijackOccurred).toBe(true);
    expect(score(threat, 'detain', 0.8).hijackOccurred).toBe(false);
    expect(score(benign, 'pass', 0.8).hijackOccurred).toBe(false);
    expect(score(benign, 'detain', 0.8).hijackOccurred).toBe(false);
  });

  it('点は整数になる', () => {
    for (const c of [0.53, 0.671, 0.849, 0.97]) {
      expect(Number.isInteger(score(threat, 'detain', c).points)).toBe(true);
    }
  });
});

describe('scoreJudge', () => {
  it('判定そのものへの確信度で人間と同じ式で採点する', () => {
    expect(scoreJudge(threat, decided('detain', 1))).toEqual(score(threat, 'detain', 1));
    expect(scoreJudge(benign, decided('pass', 0.9))).toEqual(score(benign, 'pass', 0.9));
  });

  it('確信度が 0.5 未満でも 0.5 として扱う', () => {
    expect(scoreJudge(benign, decided('pass', 0.2)).points).toBe(score(benign, 'pass', 0.5).points);
  });

  it('ハイジャック確率が低くても、拘束判定への確信度が高ければボーナスが付く', () => {
    const jev = decided('detain', 0.99, 0.06);
    expect(scoreJudge(threat, jev).points).toBe(score(threat, 'detain', 0.99).points);
    expect(scoreJudge(threat, jev).points).toBeGreaterThan(score(threat, 'detain', 0.5).points);
  });

  it('判定不能は 0 点で、見逃しにもハイジャックにもしない', () => {
    expect(scoreJudge(threat, { kind: 'unavailable', reason: 'timeout' })).toEqual({
      outcome: 'unavailable',
      points: 0,
      hijackOccurred: false,
    });
  });
});
