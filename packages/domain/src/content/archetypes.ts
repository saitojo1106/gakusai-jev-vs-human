import type { ArchetypeId, Demeanor, TravelPurpose } from '../types.js';

export const ILLUSTRATION_MOODS = ['calm', 'nervous', 'evasive'] as const;

export type IllustrationMood = (typeof ILLUSTRATION_MOODS)[number];

export interface Archetype {
  readonly id: ArchetypeId;
  readonly label: string;
  readonly ageBand: '20s' | '30s' | '40s' | '50s' | '60s+';
  readonly purposes: readonly TravelPurpose['stated'][];
  readonly notableItems: readonly string[];
}

const archetype = (
  id: string,
  label: string,
  ageBand: Archetype['ageBand'],
  purposes: readonly TravelPurpose['stated'][],
  notableItems: readonly string[],
): Archetype => ({ id: id as ArchetypeId, label, ageBand, purposes, notableItems });

export const ARCHETYPES: readonly Archetype[] = [
  archetype('athlete_30s', 'スポーツウェアの旅行者', '30s', ['tourism', 'business'], ['gym_bag']),
  archetype('backpacker_20s', 'バックパッカー', '20s', ['tourism'], ['large_backpack']),
  archetype('businessman_40s', 'ビジネススーツの出張者', '40s', ['business'], ['briefcase']),
  archetype('formal_40s', 'フォーマルな装いの旅行者', '40s', ['family', 'business'], ['garment_bag']),
  archetype('parent_30s', '家族旅行の親', '30s', ['family', 'tourism'], ['stroller']),
  archetype('senior_60s', '高齢の旅行者', '60s+', ['family', 'tourism'], ['cane']),
  archetype('student_20s', '学生', '20s', ['study', 'tourism'], ['laptop_bag']),
  archetype('tradesman_50s', '作業着の職人', '50s', ['relocation', 'business'], ['tool_bag']),
];

export const moodOf = (demeanor: Demeanor): IllustrationMood => {
  if (demeanor === 'calm') return 'calm';
  if (demeanor === 'evasive' || demeanor === 'irritable') return 'evasive';
  return 'nervous';
};

export const passengerImage = (archetype: ArchetypeId, demeanor: Demeanor): string =>
  `/img/passengers/passenger_${archetype}_${moodOf(demeanor)}.png`;

export const PASSENGER_IMAGES: readonly string[] = ARCHETYPES.flatMap((a) =>
  ILLUSTRATION_MOODS.map((mood) => `/img/passengers/passenger_${a.id}_${mood}.png`),
);
