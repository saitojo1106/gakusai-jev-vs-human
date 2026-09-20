import type { Localized } from '../i18n.js';
import type { ArchetypeId, Demeanor, TravelPurpose } from '../types.js';

export const ILLUSTRATION_MOODS = ['calm', 'nervous', 'evasive'] as const;

export type IllustrationMood = (typeof ILLUSTRATION_MOODS)[number];

export interface Archetype {
  readonly id: ArchetypeId;
  readonly label: Localized;
  readonly ageBand: '20s' | '30s' | '40s' | '50s' | '60s+';
  readonly purposes: readonly TravelPurpose['stated'][];
  readonly notableItems: readonly string[];
}

const archetype = (
  id: string,
  label: Localized,
  ageBand: Archetype['ageBand'],
  purposes: readonly TravelPurpose['stated'][],
  notableItems: readonly string[],
): Archetype => ({ id: id as ArchetypeId, label, ageBand, purposes, notableItems });

export const ARCHETYPES: readonly Archetype[] = [
  archetype('athlete_30s', { ja: 'スポーツウェアの旅行者', en: 'Traveller in sportswear' }, '30s', ['tourism', 'business'], ['gym_bag']),
  archetype('backpacker_20s', { ja: 'バックパッカー', en: 'Backpacker' }, '20s', ['tourism'], ['large_backpack']),
  archetype('businessman_40s', { ja: 'ビジネススーツの出張者', en: 'Business traveller in a suit' }, '40s', ['business'], ['briefcase']),
  archetype('formal_40s', { ja: 'フォーマルな装いの旅行者', en: 'Formally dressed traveller' }, '40s', ['family', 'business'], ['garment_bag']),
  archetype('parent_30s', { ja: '家族旅行の親', en: 'Parent on a family trip' }, '30s', ['family', 'tourism'], ['stroller']),
  archetype('senior_60s', { ja: '高齢の旅行者', en: 'Elderly traveller' }, '60s+', ['family', 'tourism'], ['cane']),
  archetype('student_20s', { ja: '学生', en: 'Student' }, '20s', ['study', 'tourism'], ['laptop_bag']),
  archetype('tradesman_50s', { ja: '作業着の職人', en: 'Tradesperson in work clothes' }, '50s', ['relocation', 'business'], ['tool_bag']),
];

export const moodOf = (demeanor: Demeanor): IllustrationMood => {
  if (demeanor === 'calm') return 'calm';
  if (demeanor === 'evasive' || demeanor === 'irritable') return 'evasive';
  return 'nervous';
};

export const passengerImage = (archetype: ArchetypeId, demeanor: Demeanor): string =>
  `/img/passengers/passenger_${archetype}_${moodOf(demeanor)}.webp`;

export const PASSENGER_IMAGES: readonly string[] = ARCHETYPES.flatMap((a) =>
  ILLUSTRATION_MOODS.map((mood) => `/img/passengers/passenger_${a.id}_${mood}.webp`),
);
