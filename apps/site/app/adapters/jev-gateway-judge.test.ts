import { generatePassenger } from '@game/domain';
import type { Dossier, PassengerIndex, Seed } from '@game/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JevGatewayJudge } from './jev-gateway-judge.js';

const dossiers = (count: number): readonly Dossier[] =>
  Array.from(
    { length: count },
    (_, i) => generatePassenger('adapter' as Seed, i as PassengerIndex).dossier,
  );

const body = (over: Record<string, unknown> = {}) => ({
  answers: {
    verdict: {
      type: 'choice',
      choice: 'detain',
      probabilities: { detain: 0.99, pass: 0.01 },
      confidence: 0.98,
    },
    threat: { probability: 0.91 },
    suspicion: { score: 3.2, confidence: 0.79 },
    documents: { probability: 0.82 },
    belongings: { probability: 0.61 },
    interview: { probability: 0.3 },
    body: { probability: 0.15 },
    background: { probability: 0.08 },
  },
  usage: { inputTokens: 900, outputTokens: 12, totalTokens: 912 },
  ...over,
});

const ok = (payload: unknown = body()) =>
  new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });

let fetchImpl: ReturnType<typeof vi.fn>;

const judge = (over: Partial<ConstructorParameters<typeof JevGatewayJudge>[0]> = {}) =>
  new JevGatewayJudge({
    apiKey: 'test-key',
    model: 'typesafe-ai/jev',
    timeoutMs: 3000,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    ...over,
  });

beforeEach(() => {
  fetchImpl = vi.fn(() => Promise.resolve(ok()));
});

describe('JevGatewayJudge', () => {
  it('乗客 1 人につき 1 リクエストを投げる', async () => {
    await judge().evaluateMany(dossiers(10));
    expect(fetchImpl).toHaveBeenCalledTimes(10);
  });

  it('応答を JudgeDecision に写す', async () => {
    const { decisions } = await judge().evaluateMany(dossiers(1));
    expect(decisions[0]?.decision).toEqual({
      kind: 'decided',
      verdict: 'detain',
      verdictConfidence: 0.99,
      threatProbability: 0.91,
      suspicion: 3.2,
      aspects: {
        documents: 0.82,
        belongings: 0.61,
        interview: 0.3,
        body: 0.15,
        background: 0.08,
      },
    });
  });

  it('1 件ごとのレイテンシと全体の壁時計時間を測る', async () => {
    const batch = await judge().evaluateMany(dossiers(3));
    expect(batch.decisions).toHaveLength(3);
    for (const d of batch.decisions) expect(d.latencyMs).toBeGreaterThanOrEqual(0);
    expect(batch.wallMs).toBeGreaterThanOrEqual(0);
  });

  it('Bearer 認証とモデル名を送る', async () => {
    await judge().evaluateMany(dossiers(1));
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('https://ai-gateway.vercel.sh/v1/evaluate');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    expect(JSON.parse(String(init.body)).model).toBe('typesafe-ai/jev');
  });

  it('既定ではゼロデータ保持を要求しない（hobby プランでは使えないため）', async () => {
    await judge().evaluateMany(dossiers(1));
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).not.toHaveProperty('providerOptions');
  });

  it('明示的に有効にしたときだけゼロデータ保持を要求する', async () => {
    await judge({ zeroDataRetention: true }).evaluateMany(dossiers(1));
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).providerOptions.gateway.zeroDataRetention).toBe(true);
  });

  it('判定 3 問と着眼点 5 問を 1 リクエストにまとめる', async () => {
    await judge().evaluateMany(dossiers(1));
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(String(init.body));

    expect(Object.keys(sent.questions).sort()).toEqual(
      ['background', 'belongings', 'body', 'documents', 'interview', 'suspicion', 'threat', 'verdict'].sort(),
    );
    expect(sent.questions.verdict.type).toBe('choice');
    expect(Object.keys(sent.questions.verdict.criteria).sort()).toEqual(['detain', 'pass']);
    expect(sent.questions.threat.type).toBe('boolean');
    expect(sent.questions.suspicion.type).toBe('score');
  });

  it('真実を一切送らない', async () => {
    await judge().evaluateMany(dossiers(10));
    for (const [, init] of fetchImpl.mock.calls as [string, RequestInit][]) {
      const text = String(init.body);
      for (const leak of ['isThreat', 'keySignals', 'threatType']) {
        expect(text).not.toContain(leak);
      }
    }
  });

  it('HTTP エラーは判定不能にする', async () => {
    fetchImpl.mockResolvedValue(new Response('nope', { status: 500 }));
    const { decisions } = await judge().evaluateMany(dossiers(1));
    expect(decisions[0]?.decision).toMatchObject({ kind: 'unavailable' });
  });

  it('HTTP エラーの理由に応答本文を残す', async () => {
    fetchImpl.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'requires a valid credit card on file' } }),
        { status: 403 },
      ),
    );
    const { decisions } = await judge().evaluateMany(dossiers(1));
    const decision = decisions[0]?.decision;

    expect(decision).toMatchObject({ kind: 'unavailable' });
    if (decision?.kind !== 'unavailable') throw new Error('unreachable');
    expect(decision.reason).toContain('403');
    expect(decision.reason).toContain('credit card');
  });

  it('応答本文が長くても理由は切り詰める', async () => {
    fetchImpl.mockResolvedValue(new Response('x'.repeat(5000), { status: 500 }));
    const { decisions } = await judge().evaluateMany(dossiers(1));
    const decision = decisions[0]?.decision;

    if (decision?.kind !== 'unavailable') throw new Error('unreachable');
    expect(decision.reason.length).toBeLessThanOrEqual(220);
  });

  it('本文が読めなくてもステータスは残す', async () => {
    fetchImpl.mockResolvedValue({
      ok: false,
      status: 502,
      text: () => Promise.reject(new Error('stream closed')),
    } as unknown as Response);
    const { decisions } = await judge().evaluateMany(dossiers(1));
    const decision = decisions[0]?.decision;

    if (decision?.kind !== 'unavailable') throw new Error('unreachable');
    expect(decision.reason).toContain('502');
  });

  it('応答の形が違えば判定不能にする', async () => {
    fetchImpl.mockResolvedValue(ok({ answers: { verdict: { choice: 'deport' } } }));
    const { decisions } = await judge().evaluateMany(dossiers(1));
    expect(decisions[0]?.decision).toMatchObject({ kind: 'unavailable' });
  });

  it('JSON でない応答は判定不能にする', async () => {
    fetchImpl.mockResolvedValue(new Response('<html>', { status: 200 }));
    const { decisions } = await judge().evaluateMany(dossiers(1));
    expect(decisions[0]?.decision).toMatchObject({ kind: 'unavailable' });
  });

  it('通信エラーは判定不能にする', async () => {
    fetchImpl.mockRejectedValue(new Error('network down'));
    const { decisions } = await judge().evaluateMany(dossiers(1));
    expect(decisions[0]?.decision).toMatchObject({ kind: 'unavailable', reason: expect.any(String) });
  });

  it('タイムアウトは判定不能にする', async () => {
    fetchImpl.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const { decisions } = await judge({ timeoutMs: 20 }).evaluateMany(dossiers(1));
    expect(decisions[0]?.decision).toMatchObject({ kind: 'unavailable' });
  });

  it('1 人が失敗しても残りの判定は返す', async () => {
    let call = 0;
    fetchImpl.mockImplementation(() => {
      call += 1;
      return call === 2 ? Promise.resolve(new Response('', { status: 503 })) : Promise.resolve(ok());
    });

    const { decisions } = await judge().evaluateMany(dossiers(3));
    expect(decisions.map((d) => d.decision.kind)).toEqual(['decided', 'unavailable', 'decided']);
  });

  it('選んだ側の確率を判定への確信度にする', async () => {
    fetchImpl.mockResolvedValue(
      ok(
        body({
          answers: {
            verdict: {
              type: 'choice',
              choice: 'pass',
              probabilities: { detain: 0.12, pass: 0.88 },
              confidence: 0.9,
            },
            threat: { probability: 0.12 },
            suspicion: { score: 0.4 },
            documents: { probability: 0.1 },
            belongings: { probability: 0.1 },
            interview: { probability: 0.1 },
            body: { probability: 0.1 },
            background: { probability: 0.1 },
          },
        }),
      ),
    );
    const { decisions } = await judge().evaluateMany(dossiers(1));
    expect(decisions[0]?.decision).toMatchObject({ verdict: 'pass', verdictConfidence: 0.88 });
  });

  it('確率がなければ confidence を使い、それもなければ 0.5 にする', async () => {
    const withoutProbabilities = body();
    delete (withoutProbabilities.answers.verdict as Record<string, unknown>).probabilities;
    fetchImpl.mockResolvedValue(ok(withoutProbabilities));

    const { decisions } = await judge().evaluateMany(dossiers(1));
    expect(decisions[0]?.decision).toMatchObject({ verdictConfidence: 0.98 });
  });

  it('判定不能でもレイテンシは記録する', async () => {
    fetchImpl.mockResolvedValue(new Response('', { status: 500 }));
    const { decisions } = await judge().evaluateMany(dossiers(1));
    expect(decisions[0]?.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
