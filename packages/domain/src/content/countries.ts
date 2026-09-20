import type { CountryCode, ResidenceEntry } from '../types.js';

export interface Country {
  readonly code: CountryCode;
  readonly name: string;
  readonly stability: ResidenceEntry['stability'];
}

const country = (code: string, name: string, stability: Country['stability']): Country => ({
  code: code as CountryCode,
  name,
  stability,
});

export const COUNTRIES: readonly Country[] = [
  country('VLD', 'ヴェルデニア', 'stable'),
  country('ORT', 'オルトマーレ', 'stable'),
  country('KSN', 'カースネン', 'stable'),
  country('TAM', 'タミレア', 'stable'),
  country('NOV', 'ノヴァリス', 'stable'),
  country('MTR', 'メトリア', 'stable'),
  country('BRG', 'ブレガンド', 'unstable'),
  country('SVN', 'シヴァナ', 'unstable'),
  country('ISH', 'イシュトナ', 'unstable'),
  country('DRC', 'ドラクア', 'conflict'),
  country('ZEN', 'ゼンカ', 'conflict'),
  country('KRL', 'カルレシア', 'conflict'),
];

export const countryOf = (code: CountryCode): Country | undefined =>
  COUNTRIES.find((c) => c.code === code);

export const COUNTRIES_BY_STABILITY = {
  stable: COUNTRIES.filter((c) => c.stability === 'stable'),
  unstable: COUNTRIES.filter((c) => c.stability === 'unstable'),
  conflict: COUNTRIES.filter((c) => c.stability === 'conflict'),
} as const;

export const DESTINATIONS: readonly string[] = [
  'ヴェルデニア国際',
  'オルトマーレ中央',
  'カースネン港',
  'タミレア新市街',
  'ノヴァリス湾岸',
  'メトリア高原',
];
