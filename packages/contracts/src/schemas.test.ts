import { generatePassenger, generateShift, score, scoreJudge, summarizeShift } from '@game/domain';
import type {
  AirportName,
  Confidence,
  PassengerIndex,
  Reveal,
  ResultId,
  Seed,
  ShiftId,
  ShiftRecord,
  ShiftResult,
} from '@game/domain';
import { describe, expect, it } from 'vitest';
import { INSPECTED_LABELS } from '@game/domain/display';
import {
  INSPECTED_ITEMS,
  dossierSchema,
  jevEvaluateResponseSchema,
  leaderboardEntrySchema,
  rankingQuerySchema,
  revealSchema,
  servePassengerResponseSchema,
  shiftRecordSchema,
  shiftResultSchema,
  startShiftRequestSchema,
  startShiftResponseSchema,
  submitVerdictRequestSchema,
} from './index.js';

const seed = 'contract-seed' as Seed;
const roundTrip = <T>(value: T): unknown => JSON.parse(JSON.stringify(value));

const decided = {
  kind: 'decided',
  verdict: 'detain',
  verdictConfidence: 0.98,
  threatProbability: 0.91,
  suspicion: 3,
  aspects: { documents: 0.82, belongings: 0.61, interview: 0.3, body: 0.15, background: 0.08 },
} as const;

const buildReveal = (index: number): Reveal => {
  const passenger = generatePassenger(seed, index as PassengerIndex);
  return {
    index: passenger.index,
    truth: passenger.truth,
    human: {
      verdict: 'detain',
      confidence: 0.8 as Confidence,
      elapsedMs: 42_000,
      inspected: ['identity', 'question:purpose'],
      ...score(passenger.truth, 'detain', 0.8),
    },
    jev: {
      decision: decided,
      latencyMs: 210,
      ...scoreJudge(passenger.truth, decided),
    },
    missedByHuman: ['mouth'],
  };
};

describe('dossierSchema', () => {
  it('生成した Dossier を JSON 往復しても同じ値に戻る', () => {
    for (let i = 0; i < 10; i += 1) {
      const { dossier } = generatePassenger(seed, i as PassengerIndex);
      expect(dossierSchema.parse(roundTrip(dossier))).toEqual(dossier);
    }
  });

  it('知らない態度は弾く', () => {
    const { dossier } = generatePassenger(seed, 0 as PassengerIndex);
    const broken = { ...roundTrip(dossier) as object, appearance: { ...dossier.appearance, demeanor: 'furious' } };
    expect(dossierSchema.safeParse(broken).success).toBe(false);
  });

  it('Truth を混ぜても Dossier としては通さない', () => {
    const { dossier, truth } = generatePassenger(seed, 0 as PassengerIndex);
    const parsed = dossierSchema.parse({ ...(roundTrip(dossier) as object), truth });
    expect(parsed).not.toHaveProperty('truth');
  });
});

describe('INSPECTED_ITEMS', () => {
  it('調査項目をひとつも取りこぼさない', () => {
    expect([...INSPECTED_ITEMS].sort()).toEqual(Object.keys(INSPECTED_LABELS).sort());
  });

  it('すべての調査項目を含む Reveal を読み書きできる', () => {
    const reveal = {
      ...buildReveal(0),
      human: { ...buildReveal(0).human, inspected: [...INSPECTED_ITEMS] },
      missedByHuman: [...INSPECTED_ITEMS],
    };
    expect(revealSchema.parse(roundTrip(reveal))).toEqual(reveal);
  });
});

describe('startShiftRequestSchema', () => {
  it('空港名を受け取る', () => {
    expect(startShiftRequestSchema.parse({ airport: 'ぼくの空港' })).toEqual({
      airport: 'ぼくの空港',
    });
  });

  it('空文字と長すぎる入力は弾く', () => {
    expect(startShiftRequestSchema.safeParse({ airport: '' }).success).toBe(false);
    expect(startShiftRequestSchema.safeParse({ airport: 'あ'.repeat(200) }).success).toBe(false);
  });
});

describe('startShiftResponseSchema', () => {
  it('判定内容を含まない Jev の計測結果だけを返す', () => {
    const value = {
      shiftId: 'abcd1234',
      jev: { perPassengerMs: [210, 180, 250], totalMs: 830, failed: 0 },
    };
    expect(startShiftResponseSchema.parse(value)).toEqual(value);
  });

  it('判定内容が混ざっていたら落とす', () => {
    const parsed = startShiftResponseSchema.parse({
      shiftId: 'abcd1234',
      jev: { perPassengerMs: [210], totalMs: 210, failed: 0, decisions: [decided] },
    });
    expect(parsed.jev).not.toHaveProperty('decisions');
  });
});

describe('submitVerdictRequestSchema', () => {
  const valid = {
    verdict: 'detain',
    confidence: 0.8,
    elapsedMs: 12_000,
    inspected: ['identity', 'question:follow_up'],
  };

  it('正しい判定を受け取る', () => {
    expect(submitVerdictRequestSchema.parse(valid)).toEqual(valid);
  });

  it('確信度は 0.5〜1.0 の範囲に限る', () => {
    expect(submitVerdictRequestSchema.safeParse({ ...valid, confidence: 0.49 }).success).toBe(false);
    expect(submitVerdictRequestSchema.safeParse({ ...valid, confidence: 1.01 }).success).toBe(false);
    expect(submitVerdictRequestSchema.safeParse({ ...valid, confidence: 0.5 }).success).toBe(true);
    expect(submitVerdictRequestSchema.safeParse({ ...valid, confidence: 1 }).success).toBe(true);
  });

  it('知らない判定・知らない調査項目は弾く', () => {
    expect(submitVerdictRequestSchema.safeParse({ ...valid, verdict: 'maybe' }).success).toBe(false);
    expect(
      submitVerdictRequestSchema.safeParse({ ...valid, inspected: ['question:salary'] }).success,
    ).toBe(false);
  });

  it('負の所要時間は弾く', () => {
    expect(submitVerdictRequestSchema.safeParse({ ...valid, elapsedMs: -1 }).success).toBe(false);
  });
});

describe('servePassengerResponseSchema', () => {
  it('Dossier と判定済みフラグを返す', () => {
    const { dossier } = generatePassenger(seed, 0 as PassengerIndex);
    const value = {
      dossier: roundTrip(dossier),
      decided: false,
      xrayUsedOn: null,
      bodyScan: null,
    };
    expect(servePassengerResponseSchema.parse(value).decided).toBe(false);
  });
});

describe('revealSchema', () => {
  it('JSON 往復しても同じ値に戻る', () => {
    const reveal = buildReveal(0);
    expect(revealSchema.parse(roundTrip(reveal))).toEqual(reveal);
  });

  it('判定不能の Jev も表現できる', () => {
    const reveal = buildReveal(1);
    const unavailable = {
      ...reveal,
      jev: {
        decision: { kind: 'unavailable', reason: 'timeout' },
        latencyMs: 3000,
        outcome: 'unavailable',
        points: 0,
        hijackOccurred: false,
      },
    };
    expect(revealSchema.parse(roundTrip(unavailable))).toEqual(unavailable);
  });
});

describe('shiftRecordSchema', () => {
  it('KV に入れて読み戻しても同じ値に戻る', () => {
    const record: ShiftRecord = {
      shiftId: 'shift001' as ShiftId,
      seed,
      airport: 'ぼくの空港' as AirportName,
      startedAt: '2026-09-20T05:00:00.000Z',
      jev: [{ decision: decided, latencyMs: 210 }],
      jevWallMs: 830,
      human: [null],
      xrayUsedOn: null,
      resultId: null,
    };
    expect(shiftRecordSchema.parse(roundTrip(record))).toEqual(record);
  });
});

describe('shiftResultSchema', () => {
  it('KV に入れて読み戻しても同じ値に戻る', () => {
    const reveals = generateShift(seed).map((p) => buildReveal(p.index));
    const result: ShiftResult = {
      resultId: 'abc12345' as ResultId,
      shiftId: 'shift001' as ShiftId,
      seed,
      airport: 'ぼくの空港' as AirportName,
      finishedAt: '2026-09-20T05:10:00.000Z',
      reveals,
      ...summarizeShift(reveals, 830),
    };
    expect(shiftResultSchema.parse(roundTrip(result))).toEqual(result);
  });
});

describe('leaderboardEntrySchema', () => {
  it('ランキング 1 件を検証する', () => {
    const entry = {
      resultId: 'abc12345',
      airport: 'ぼくの空港',
      level: 4,
      points: 130,
      marginOverJev: 10,
      finishedAt: '2026-09-20T05:10:00.000Z',
    };
    expect(leaderboardEntrySchema.parse(entry)).toEqual(entry);
  });

  it('レベルは 1〜5 に限る', () => {
    const entry = {
      resultId: 'abc12345',
      airport: 'ぼくの空港',
      level: 6,
      points: 130,
      marginOverJev: 10,
      finishedAt: '2026-09-20T05:10:00.000Z',
    };
    expect(leaderboardEntrySchema.safeParse(entry).success).toBe(false);
  });
});

describe('rankingQuerySchema', () => {
  it('空港名の絞り込みは省略できる', () => {
    expect(rankingQuerySchema.parse({})).toEqual({});
    expect(rankingQuerySchema.parse({ airport: '羽田第 3' })).toEqual({ airport: '羽田第 3' });
  });
});

describe('jevEvaluateResponseSchema', () => {
  const response = {
    answers: {
      verdict: { choice: 'detain' },
      threat: { probability: 0.91 },
      suspicion: { score: 3.2 },
      documents: { probability: 0.82 },
      belongings: { probability: 0.61 },
      interview: { probability: 0.3 },
      body: { probability: 0.15 },
      background: { probability: 0.08 },
    },
    usage: { inputTokens: 900, outputTokens: 12, totalTokens: 912 },
  };

  it('Jev の応答を検証して取り出す', () => {
    const parsed = jevEvaluateResponseSchema.parse(response);
    expect(parsed.answers.verdict.choice).toBe('detain');
    expect(parsed.answers.threat.probability).toBeCloseTo(0.91);
    expect(parsed.answers.suspicion.score).toBeCloseTo(3.2);
  });

  it('usage が欠けていても通す', () => {
    const { usage: _usage, ...withoutUsage } = response;
    expect(jevEvaluateResponseSchema.safeParse(withoutUsage).success).toBe(true);
  });

  it('知らない選択肢は弾く', () => {
    const broken = {
      ...response,
      answers: { ...response.answers, verdict: { choice: 'deport' } },
    };
    expect(jevEvaluateResponseSchema.safeParse(broken).success).toBe(false);
  });

  it('着眼点が欠けていたら弾く', () => {
    const { documents: _documents, ...answers } = response.answers;
    expect(jevEvaluateResponseSchema.safeParse({ ...response, answers }).success).toBe(false);
  });

  it('確率が範囲外なら弾く', () => {
    const broken = {
      ...response,
      answers: { ...response.answers, threat: { probability: 1.4 } },
    };
    expect(jevEvaluateResponseSchema.safeParse(broken).success).toBe(false);
  });
});
