export const LOCALES = ['ja', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ja';

/** 表示用の文字列。ドメインが持つ文言はすべてこの形にする。 */
export type Localized = Readonly<Record<Locale, string>>;

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/**
 * Accept-Language ヘッダから対応言語を選ぶ。q 値は見ず、先に現れた方を優先する。
 * 判定できなければ null を返し、呼び出し側の既定に任せる。
 */
export const localeFromAcceptLanguage = (header: string | null | undefined): Locale | null => {
  if (!header) return null;
  for (const part of header.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase() ?? '';
    if (tag.startsWith('ja')) return 'ja';
    if (tag.startsWith('en')) return 'en';
  }
  return null;
};

export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  ja: '日本語',
  en: 'English',
};
