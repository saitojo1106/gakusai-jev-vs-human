import { describe, expect, it } from 'vitest';

/**
 * `FOO_LABELS[key]` のような Localized をそのまま JSX に置くと、型は通るのに
 * 画面には [object Object] が出る。しかも hono/jsx では描画がそこで止まり、
 * 「読み込み中のまま固まる」という無関係に見える症状になる。
 * 文字列に解決し忘れた参照を機械的に落とす。
 */
const LOOKUP = /[A-Z][A-Z_]*_LABELS(\?\.)?\[[^\]]+\]/g;
const RESOLVED = /^(\[locale\]|\?\.\[locale\])/;

export const unresolvedLocalized = (text: string): number[] => {
  const lines: number[] = [];
  for (const [index, line] of text.split('\n').entries()) {
    for (const match of line.matchAll(LOOKUP)) {
      const rest = line.slice((match.index ?? 0) + match[0].length);
      if (!RESOLVED.test(rest)) lines.push(index + 1);
    }
  }
  return lines;
};

describe('unresolvedLocalized', () => {
  it('解決していない参照を見つける', () => {
    expect(unresolvedLocalized('{DEMEANOR_LABELS[d]}')).toEqual([1]);
    expect(unresolvedLocalized('{ITEM_LABELS[k] ?? k}')).toEqual([1]);
    expect(unresolvedLocalized('a\nb\n{FLAG_LABELS[f]}')).toEqual([3]);
  });

  it('解決済みの参照は見逃す', () => {
    expect(unresolvedLocalized('{DEMEANOR_LABELS[d][locale]}')).toEqual([]);
    expect(unresolvedLocalized('{ITEM_LABELS[k]?.[locale] ?? k}')).toEqual([]);
  });
});

const modules = import.meta.glob('../**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const sources = Object.entries(modules)
  .filter(([name]) => !name.includes('.test.'))
  .map(([name, text]) => ({ name, text }));

describe('Localized の解決漏れ', () => {
  it('検査対象の tsx が見つかっている', () => {
    expect(sources.length).toBeGreaterThan(3);
  });

  it('*_LABELS[...] は必ず [locale] で文字列にしている', () => {
    const offenders = sources.flatMap(({ name, text }) =>
      unresolvedLocalized(text).map((line) => `${name}:${line}`),
    );
    expect(offenders).toEqual([]);
  });
});
