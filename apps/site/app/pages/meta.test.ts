import { LEVELS } from '@game/domain';
import type { AirportName, Level, ResultId, Seed, ShiftId, ShiftResult } from '@game/domain';
import { describe, expect, it } from 'vitest';
import { buildResultMeta } from './meta.js';

const result = (over: Partial<ShiftResult> = {}): ShiftResult => ({
  resultId: 'abc12345' as ResultId,
  shiftId: 'shift001' as ShiftId,
  seed: 'seed0001' as Seed,
  airport: 'ぼくの空港' as AirportName,
  finishedAt: '2026-09-20T05:10:00.000Z',
  reveals: Array.from({ length: 10 }, () => ({}) as never),
  totals: {
    human: { points: 130, correct: 8, missedThreats: 1, falseDetains: 1, elapsedMs: 372_000 },
    jev: { points: 100, correct: 7, missedThreats: 2, falseDetains: 1, elapsedMs: 830 },
  },
  winner: 'human',
  level: 4,
  ...over,
});

const origin = 'https://example.test';

describe('buildResultMeta', () => {
  it('タイトルに空港名とレベルと称号を入れる', () => {
    const meta = buildResultMeta(result(), origin);
    expect(meta.title).toContain('ぼくの空港');
    expect(meta.title).toContain('Lv.4');
    expect(meta.title).toContain(LEVELS[4].title);
  });

  it('説明にスコアと正答数とキャッチコピーを入れる', () => {
    const meta = buildResultMeta(result(), origin);
    expect(meta.description).toContain('130');
    expect(meta.description).toContain('100');
    expect(meta.description).toContain('8/10');
    expect(meta.description).toContain(LEVELS[4].catchphrase);
  });

  it('OG 画像はレベルカードの絶対 URL', () => {
    for (const level of [1, 2, 3, 4, 5] as const satisfies readonly Level[]) {
      const meta = buildResultMeta(result({ level }), origin);
      expect(meta.image).toBe(`${origin}/img/levels/level_${level}.png`);
    }
  });

  it('正規 URL は結果ページを指す', () => {
    expect(buildResultMeta(result(), origin).url).toBe('https://example.test/r/abc12345');
  });

  it('X のシェア URL は intent エンドポイントに本文と URL を載せる', () => {
    const meta = buildResultMeta(result(), origin);
    const parsed = new URL(meta.shareUrl);

    expect(parsed.origin + parsed.pathname).toBe('https://x.com/intent/post');
    expect(parsed.searchParams.get('url')).toBe(meta.url);
    expect(parsed.searchParams.get('text')).toContain('Lv.4');
    expect(parsed.searchParams.get('text')).toContain('#保安検査vsJev');
  });

  it('シェア本文に URL を二重に入れない', () => {
    const meta = buildResultMeta(result(), origin);
    expect(parseText(meta.shareUrl)).not.toContain(meta.url);
  });

  it('シェア本文は 280 文字以内', () => {
    const meta = buildResultMeta(
      result({ airport: 'あ'.repeat(20) as AirportName, level: 5 }),
      origin,
    );
    expect([...meta.shareText].length).toBeLessThanOrEqual(280);
  });
});

const parseText = (shareUrl: string): string =>
  new URL(shareUrl).searchParams.get('text') ?? '';
