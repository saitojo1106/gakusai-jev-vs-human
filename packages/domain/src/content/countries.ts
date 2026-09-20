import type { Localized } from '../i18n.js';
import type { CountryCode, ResidenceEntry } from '../types.js';

export interface Country {
  readonly code: CountryCode;
  readonly name: Localized;
  readonly stability: ResidenceEntry['stability'];
}

const country = (
  code: string,
  ja: string,
  en: string,
  stability: Country['stability'],
): Country => ({
  code: code as CountryCode,
  name: { ja, en },
  stability,
});

export const COUNTRIES: readonly Country[] = [
  country('VLD', 'ヴェルデニア', 'Verdenia', 'stable'),
  country('ORT', 'オルトマーレ', 'Ortmare', 'stable'),
  country('KSN', 'カースネン', 'Kasnen', 'stable'),
  country('TAM', 'タミレア', 'Tamirea', 'stable'),
  country('NOV', 'ノヴァリス', 'Novalis', 'stable'),
  country('MTR', 'メトリア', 'Metria', 'stable'),
  country('BRG', 'ブレガンド', 'Bregand', 'unstable'),
  country('SVN', 'シヴァナ', 'Sivana', 'unstable'),
  country('ISH', 'イシュトナ', 'Ishtona', 'unstable'),
  country('DRC', 'ドラクア', 'Dracqua', 'conflict'),
  country('ZEN', 'ゼンカ', 'Zenka', 'conflict'),
  country('KRL', 'カルレシア', 'Kallesia', 'conflict'),
];

export const countryOf = (code: CountryCode): Country | undefined =>
  COUNTRIES.find((c) => c.code === code);

export const COUNTRIES_BY_STABILITY = {
  stable: COUNTRIES.filter((c) => c.stability === 'stable'),
  unstable: COUNTRIES.filter((c) => c.stability === 'unstable'),
  conflict: COUNTRIES.filter((c) => c.stability === 'conflict'),
} as const;

export const DESTINATIONS: readonly Localized[] = [
  { ja: 'ヴェルデニア国際', en: 'Verdenia International' },
  { ja: 'オルトマーレ中央', en: 'Ortmare Central' },
  { ja: 'カースネン港', en: 'Kasnen Harbour' },
  { ja: 'タミレア新市街', en: 'Tamirea New Town' },
  { ja: 'ノヴァリス湾岸', en: 'Novalis Bayside' },
  { ja: 'メトリア高原', en: 'Metria Highlands' },
];
