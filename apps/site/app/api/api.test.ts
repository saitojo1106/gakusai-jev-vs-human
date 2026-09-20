import {
  FakeJudge,
  FixedClock,
  InMemoryLeaderboard,
  InMemoryResultStore,
  InMemoryShiftStore,
  StubIdGenerator,
} from '@game/application/fakes';
import type { UsecaseDeps } from '@game/application';
import { PASSENGERS_PER_SHIFT } from '@game/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApi } from './index.js';

let deps: UsecaseDeps;
let api: ReturnType<typeof createApi>;

const build = (over: Partial<UsecaseDeps> = {}) => {
  deps = {
    judge: new FakeJudge(),
    shifts: new InMemoryShiftStore(),
    results: new InMemoryResultStore(),
    leaderboard: new InMemoryLeaderboard(),
    ids: new StubIdGenerator(['shift001'], ['result01'], ['seed0001']),
    clock: new FixedClock(),
    publicOrigin: 'https://example.test',
    ...over,
  };
  api = createApi(deps);
};

type Json = Record<string, any> & any[];

const readJson = async (res: Response): Promise<Json> => res.json();

const post = (path: string, body?: unknown) =>
  api.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const verdict = {
  verdict: 'pass',
  confidence: 0.8,
  elapsedMs: 20_000,
  inspected: ['identity'],
};

const startShift = () => post('/api/shift', { airport: 'ぼくの空港' });

const playAll = async () => {
  await startShift();
  for (let n = 0; n < PASSENGERS_PER_SHIFT; n += 1) {
    await post(`/api/shift/shift001/passenger/${n}/verdict`, verdict);
  }
};

beforeEach(() => build());

describe('POST /api/shift', () => {
  it('シフトを開始して Jev の計測結果を返す', async () => {
    const res = await startShift();
    expect(res.status).toBe(200);

    const body = await readJson(res);
    expect(body.shiftId).toBe('shift001');
    expect(body.jev.perPassengerMs).toHaveLength(PASSENGERS_PER_SHIFT);
    expect(body.jev.failed).toBe(0);
  });

  it('Jev の判定内容は返さない', async () => {
    expect(await (await startShift()).text()).not.toContain('threatProbability');
  });

  it('空の空港名は 400', async () => {
    const res = await post('/api/shift', { airport: '   ' });
    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('invalid_airport');
  });

  it('長すぎる空港名は 400', async () => {
    const res = await post('/api/shift', { airport: 'あ'.repeat(21) });
    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('airport_too_long');
  });

  it('本文が壊れていたら 400', async () => {
    expect((await post('/api/shift', { airport: 123 })).status).toBe(400);
    expect((await post('/api/shift')).status).toBe(400);
  });
});

describe('GET /api/shift/:id/passenger/:n', () => {
  beforeEach(startShift);

  it('Dossier を返す', async () => {
    const res = await api.request('/api/shift/shift001/passenger/0');
    expect(res.status).toBe(200);

    const body = await readJson(res);
    expect(body.dossier.appearance).toBeDefined();
    expect(body.decided).toBe(false);
  });

  it('真実を返さない', async () => {
    const text = await (await api.request('/api/shift/shift001/passenger/0')).text();
    for (const leak of ['isThreat', 'keySignals', 'threatType']) {
      expect(text).not.toContain(leak);
    }
  });

  it('存在しないシフトは 404', async () => {
    expect((await api.request('/api/shift/nope/passenger/0')).status).toBe(404);
  });

  it('範囲外の乗客番号は 404', async () => {
    expect((await api.request('/api/shift/shift001/passenger/10')).status).toBe(404);
    expect((await api.request('/api/shift/shift001/passenger/abc')).status).toBe(404);
  });
});

describe('POST /api/shift/:id/passenger/:n/verdict', () => {
  beforeEach(startShift);

  it('判定を受け付けて Reveal を返す', async () => {
    const res = await post('/api/shift/shift001/passenger/0/verdict', verdict);
    expect(res.status).toBe(200);

    const body = await readJson(res);
    expect(body.truth).toBeDefined();
    expect(body.human.verdict).toBe('pass');
    expect(body.jev.decision).toBeDefined();
  });

  it('2 回目は 409 で 1 回目の結果を返す', async () => {
    const first = await readJson(await post('/api/shift/shift001/passenger/0/verdict', verdict));
    const res = await post('/api/shift/shift001/passenger/0/verdict', {
      ...verdict,
      verdict: 'detain',
    });

    expect(res.status).toBe(409);
    expect(await readJson(res)).toEqual(first);
  });

  it('確信度が範囲外なら 400', async () => {
    const res = await post('/api/shift/shift001/passenger/0/verdict', {
      ...verdict,
      confidence: 0.2,
    });
    expect(res.status).toBe(400);
  });

  it('知らない調査項目は 400', async () => {
    const res = await post('/api/shift/shift001/passenger/0/verdict', {
      ...verdict,
      inspected: ['question:salary'],
    });
    expect(res.status).toBe(400);
  });

  it('存在しないシフトは 404', async () => {
    expect((await post('/api/shift/nope/passenger/0/verdict', verdict)).status).toBe(404);
  });
});

describe('POST /api/shift/:id/finish', () => {
  it('結果 ID と共有 URL を返す', async () => {
    await playAll();
    const res = await post('/api/shift/shift001/finish');

    expect(res.status).toBe(200);
    expect(await readJson(res)).toEqual({
      resultId: 'result01',
      url: 'https://example.test/r/result01',
    });
  });

  it('10 人終わっていなければ 409', async () => {
    await startShift();
    const res = await post('/api/shift/shift001/finish');

    expect(res.status).toBe(409);
    expect((await readJson(res)).error).toBe('shift_incomplete');
  });

  it('存在しないシフトは 404', async () => {
    expect((await post('/api/shift/nope/finish')).status).toBe(404);
  });
});

describe('GET /api/result/:id', () => {
  it('結果を返す', async () => {
    await playAll();
    await post('/api/shift/shift001/finish');
    const res = await api.request('/api/result/result01');

    expect(res.status).toBe(200);
    expect((await readJson(res)).reveals).toHaveLength(PASSENGERS_PER_SHIFT);
  });

  it('存在しない結果は 404', async () => {
    expect((await api.request('/api/result/nope')).status).toBe(404);
  });
});

describe('GET /api/ranking', () => {
  it('ランキングを返す', async () => {
    await playAll();
    await post('/api/shift/shift001/finish');
    const res = await api.request('/api/ranking');

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body).toHaveLength(1);
    expect(body[0].airport).toBe('ぼくの空港');
  });

  it('空港名で絞り込める', async () => {
    await playAll();
    await post('/api/shift/shift001/finish');

    expect(await readJson(await api.request('/api/ranking?airport=ぼくの空港'))).toHaveLength(1);
    expect(await readJson(await api.request('/api/ranking?airport=よその空港'))).toHaveLength(0);
  });

  it('まだ誰も遊んでいなければ空配列', async () => {
    expect(await readJson(await api.request('/api/ranking'))).toEqual([]);
  });
});

describe('知らないパス', () => {
  it('404 を返す', async () => {
    expect((await api.request('/api/nope')).status).toBe(404);
  });
});
