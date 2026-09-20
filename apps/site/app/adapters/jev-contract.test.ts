import { jevEvaluateResponseSchema } from '@game/contracts';
import { generatePassenger, scoreJudge } from '@game/domain';
import type { PassengerIndex, Seed, Truth } from '@game/domain';
import { describe, expect, it, vi } from 'vitest';
import fixture from './__fixtures__/jev-response.json';
import { JevGatewayJudge } from './jev-gateway-judge.js';

const dossier = generatePassenger('contract' as Seed, 0 as PassengerIndex).dossier;

const judgeWith = (payload: unknown) =>
  new JevGatewayJudge({
    apiKey: 'test-key',
    fetchImpl: vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ) as unknown as typeof fetch,
  });

describe('Jev の実応答（2026-09-20 に typesafe-ai/jev から取得）', () => {
  it('スキーマで検証できる', () => {
    expect(jevEvaluateResponseSchema.safeParse(fixture).success).toBe(true);
  });

  it('判定・着眼点・疑い度をすべて取り出せる', async () => {
    const { decisions } = await judgeWith(fixture).evaluateMany([dossier]);
    expect(decisions[0]?.decision).toEqual({
      kind: 'decided',
      verdict: 'detain',
      verdictConfidence: 0.99,
      threatProbability: 0.06,
      suspicion: 3.75,
      aspects: {
        documents: 0.97,
        belongings: 0.79,
        interview: 0.93,
        body: 0.81,
        background: 0.89,
      },
    });
  });

  it('モデル名や providerMetadata は落として持ち込まない', async () => {
    const { decisions } = await judgeWith(fixture).evaluateMany([dossier]);
    expect(JSON.stringify(decisions[0])).not.toContain('providerMetadata');
    expect(JSON.stringify(decisions[0])).not.toContain('generationId');
  });

  it('ハイジャック確率が低くても拘束判定の確信度で採点する', async () => {
    const { decisions } = await judgeWith(fixture).evaluateMany([dossier]);
    const decision = decisions[0]?.decision;
    if (decision?.kind !== 'decided') throw new Error('unreachable');

    const threat: Truth = { isThreat: true, threatType: 'hijack', keySignals: [] };
    const scored = scoreJudge(threat, decision);

    expect(scored.outcome).toBe('correct_detain');
    expect(scored.points).toBe(40);
  });

  it('無害な乗客を拘束していれば誤検知として重く引かれる', async () => {
    const { decisions } = await judgeWith(fixture).evaluateMany([dossier]);
    const decision = decisions[0]?.decision;
    if (decision?.kind !== 'decided') throw new Error('unreachable');

    const benign: Truth = { isThreat: false, threatType: 'none', keySignals: [] };
    const scored = scoreJudge(benign, decision);

    expect(scored.outcome).toBe('false_detain');
    expect(scored.points).toBe(-20);
  });
});
