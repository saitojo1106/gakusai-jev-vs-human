import { describe, expect, it } from 'vitest';
import { isLocale, localeFromAcceptLanguage } from './i18n.js';

describe('isLocale', () => {
  it('対応言語だけを通す', () => {
    expect(isLocale('ja')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe('localeFromAcceptLanguage', () => {
  it('先に現れた対応言語を選ぶ', () => {
    expect(localeFromAcceptLanguage('en-US,en;q=0.9,ja;q=0.8')).toBe('en');
    expect(localeFromAcceptLanguage('ja,en-US;q=0.9')).toBe('ja');
  });

  it('地域付きのタグも拾う', () => {
    expect(localeFromAcceptLanguage('en-GB')).toBe('en');
    expect(localeFromAcceptLanguage('ja-JP')).toBe('ja');
  });

  it('対応しない言語は読み飛ばす', () => {
    expect(localeFromAcceptLanguage('fr-FR,de;q=0.9,en;q=0.8')).toBe('en');
  });

  it('判定できなければ null', () => {
    expect(localeFromAcceptLanguage('fr-FR,de')).toBeNull();
    expect(localeFromAcceptLanguage('')).toBeNull();
    expect(localeFromAcceptLanguage(null)).toBeNull();
  });
});
