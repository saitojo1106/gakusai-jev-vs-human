import type { ArchetypeId, Demeanor, TravelPurpose } from '../types.js';

export const ILLUSTRATION_MOODS = ['calm', 'nervous', 'evasive'] as const;

export type IllustrationMood = (typeof ILLUSTRATION_MOODS)[number];

export interface Archetype {
  readonly id: ArchetypeId;
  readonly label: string;
  readonly ageBand: '20s' | '30s' | '40s' | '50s' | '60s+';
  readonly purposes: readonly TravelPurpose['stated'][];
  readonly notableItems: readonly string[];
  readonly mvp: boolean;
}

const archetype = (
  id: string,
  label: string,
  ageBand: Archetype['ageBand'],
  purposes: readonly TravelPurpose['stated'][],
  notableItems: readonly string[],
  mvp: boolean,
): Archetype => ({ id: id as ArchetypeId, label, ageBand, purposes, notableItems, mvp });

export const ARCHETYPES: readonly Archetype[] = [
  archetype('businessman_40s', 'ビジネススーツの出張者', '40s', ['business'], ['briefcase'], true),
  archetype('backpacker_20s', 'バックパッカー', '20s', ['tourism'], ['large_backpack'], true),
  archetype('family_parent_30s', '家族旅行の親', '30s', ['family', 'tourism'], ['stroller'], true),
  archetype('craftsman_30s', '作業着の職人', '30s', ['business', 'relocation'], ['tool_bag'], true),
  archetype('elder_traveler_60s', '高齢の旅行者', '60s+', ['family', 'tourism'], ['cane'], true),
  archetype('student_20s', '学生', '20s', ['study', 'tourism'], ['laptop_bag'], true),
  archetype('athlete_30s', 'スポーツウェアの旅行者', '30s', ['business', 'tourism'], ['gym_bag'], true),
  archetype('heavy_coat_50s', '季節外れの厚着', '50s', ['other', 'relocation'], ['thick_coat'], true),
  archetype('formal_dress_30s', 'フォーマルドレス', '30s', ['family', 'business'], ['garment_bag'], false),
  archetype('monk_50s', '僧衣の旅行者', '50s', ['other', 'family'], ['prayer_beads'], false),
  archetype('medic_40s', '医療従事者風', '40s', ['business', 'other'], ['medical_case'], false),
  archetype('pilot_look_40s', 'パイロット風の制服', '40s', ['business'], ['crew_bag'], false),
  archetype('musician_20s', '楽器を抱えた旅行者', '20s', ['business', 'tourism'], ['instrument_case'], false),
  archetype('photographer_30s', 'カメラ機材の旅行者', '30s', ['business', 'tourism'], ['camera_bag'], false),
  archetype('sunglasses_40s', '室内でサングラス', '40s', ['tourism', 'other'], ['sunglasses_indoors'], false),
  archetype('retiree_60s', '退職後の長期滞在者', '60s+', ['relocation', 'family'], ['suitcase_worn'], false),
];

export const MVP_ARCHETYPES: readonly Archetype[] = ARCHETYPES.filter((a) => a.mvp);

export const moodOf = (demeanor: Demeanor): IllustrationMood => {
  if (demeanor === 'calm') return 'calm';
  if (demeanor === 'evasive' || demeanor === 'irritable') return 'evasive';
  return 'nervous';
};

export const passengerImage = (archetype: ArchetypeId, demeanor: Demeanor): string =>
  `/images/passengers/passenger_${archetype}_${moodOf(demeanor)}.png`;

export const PASSENGER_IMAGES: readonly string[] = ARCHETYPES.flatMap((a) =>
  ILLUSTRATION_MOODS.map((mood) => `/images/passengers/passenger_${a.id}_${mood}.png`),
);
