import { LOCALES } from '@game/domain';
import { describe, expect, it } from 'vitest';
import { localeHref, resolveLocale, ui } from './i18n.js';

const request = (over: Partial<Parameters<typeof resolveLocale>[0]> = {}) => ({
  query: undefined,
  cookie: undefined,
  acceptLanguage: undefined,
  ...over,
});

describe('resolveLocale', () => {
  it('?lang が最優先', () => {
    expect(
      resolveLocale(request({ query: 'en', cookie: 'lang=ja', acceptLanguage: 'ja' })),
    ).toBe('en');
  });

  it('?lang がなければ Cookie', () => {
    expect(resolveLocale(request({ cookie: 'foo=1; lang=en; bar=2', acceptLanguage: 'ja' }))).toBe(
      'en',
    );
  });

  it('Cookie もなければ Accept-Language', () => {
    expect(resolveLocale(request({ acceptLanguage: 'en-US,en;q=0.9' }))).toBe('en');
  });

  it('どれも無ければ日本語', () => {
    expect(resolveLocale(request())).toBe('ja');
    expect(resolveLocale(request({ query: 'fr', cookie: 'lang=de' }))).toBe('ja');
  });
});

describe('localeHref', () => {
  it('パスと既存クエリを保ったまま lang を差し替える', () => {
    expect(localeHref('https://example.test/ranking?airport=A&lang=ja', 'en')).toBe(
      '/ranking?airport=A&lang=en',
    );
  });

  it('lang が無ければ足す', () => {
    expect(localeHref('https://example.test/r/abc', 'en')).toBe('/r/abc?lang=en');
  });
});

describe('ui', () => {
  it('どの言語でも同じキーが揃っている', () => {
    const [first, ...rest] = LOCALES.map((l) => Object.keys(ui(l)).sort());
    for (const keys of rest) expect(keys).toEqual(first);
  });

  it('日本語の文言に英語が混ざっていない（固有名詞を除く）', () => {
    expect(ui('ja').startShift).toBe('シフト開始');
    expect(ui('en').startShift).toBe('Start shift');
  });
});
