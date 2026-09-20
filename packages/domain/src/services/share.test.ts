import { describe, expect, it } from 'vitest';
import { LEVELS } from '../content/levels.js';
import type { AirportName, Level, ShiftResult, Totals } from '../types.js';
import { buildShareText } from './share.js';

const totals = (over: Partial<Totals> = {}): Totals => ({
  points: 0,
  correct: 0,
  missedThreats: 0,
  falseDetains: 0,
  elapsedMs: 0,
  ...over,
});

const result = (
  over: Partial<Pick<ShiftResult, 'airport' | 'level' | 'totals'>> = {},
): Pick<ShiftResult, 'airport' | 'level' | 'totals'> => ({
  airport: 'ぼくの空港' as AirportName,
  level: 4,
  totals: {
    human: totals({ points: 120, correct: 8, missedThreats: 1, falseDetains: 1 }),
    jev: totals({ points: 100, correct: 7 }),
  },
  ...over,
});

const url = 'https://example.test/r/abc123';

describe('buildShareText', () => {
  it('空港名・レベル・称号・キャッチコピー・スコア・URL を含む', () => {
    const text = buildShareText(result(), url);
    expect(text).toContain('ぼくの空港');
    expect(text).toContain('Lv.4');
    expect(text).toContain(LEVELS[4].title.ja);
    expect(text).toContain(LEVELS[4].catchphrase.ja);
    expect(text).toContain('120');
    expect(text).toContain('100');
    expect(text).toContain(url);
  });

  it('正答数と見逃し数を含む', () => {
    const text = buildShareText(result(), url);
    expect(text).toContain('8/10');
    expect(text).toContain('見逃し 1');
  });

  it('ハッシュタグを含む', () => {
    expect(buildShareText(result(), url)).toContain('#保安検査vsJev');
  });

  it('どのレベル・最長の空港名でも 280 文字以内に収まる', () => {
    for (const level of [1, 2, 3, 4, 5] as const satisfies readonly Level[]) {
      const text = buildShareText(
        result({
          level,
          airport: 'あ'.repeat(20) as AirportName,
          totals: {
            human: totals({ points: -600, correct: 10, missedThreats: 10, falseDetains: 10 }),
            jev: totals({ points: -600 }),
          },
        }),
        url,
      );
      expect([...text].length).toBeLessThanOrEqual(280);
    }
  });

  it('URL は末尾に置く', () => {
    expect(buildShareText(result(), url).endsWith(url)).toBe(true);
  });
});

describe('buildShareText（英語）', () => {
  it('英語の称号・キャッチコピー・ハッシュタグを使う', () => {
    const text = buildShareText(result(), 'https://example.test/r/abc', 'en');
    expect(text).toContain(LEVELS[4].title.en);
    expect(text).toContain(LEVELS[4].catchphrase.en);
    expect(text).toContain('#CheckpointVsJev');
    expect(text).not.toContain('保安検査');
  });

  it('日本語と英語で別の本文になる', () => {
    const url = 'https://example.test/r/abc';
    expect(buildShareText(result(), url, 'en')).not.toBe(buildShareText(result(), url, 'ja'));
  });
});
