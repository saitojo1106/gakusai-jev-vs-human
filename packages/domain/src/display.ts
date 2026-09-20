import { COUNTRIES } from './content/countries.js';
import type { Locale, Localized } from './i18n.js';
export { LOCALES, LOCALE_NAMES, DEFAULT_LOCALE, isLocale, localeFromAcceptLanguage } from './i18n.js';
export type { Locale, Localized } from './i18n.js';
import { ITEMS } from './content/items.js';
import { PURPOSE_LABELS } from './content/questions.js';
import type {
  AspectId,
  BackgroundRecord,
  BodyScanFinding,
  BoardingPass,
  Demeanor,
  ForgeryObservation,
  IdentityDocument,
  InspectedItem,
  InterviewExchange,
  ItemFlag,
  MouthInspection,
  Outcome,
  ResidenceEntry,
} from './types.js';

export { PASSENGERS_PER_SHIFT } from './constants.js';
export { LEVELS, type LevelCard } from './content/levels.js';
export { moodOf, passengerImage, PASSENGER_IMAGES } from './content/archetypes.js';
export { PURPOSE_LABELS };

export const ITEM_LABELS: Readonly<Record<string, Localized>> = Object.fromEntries(
  ITEMS.map((item) => [item.kind, item.label]),
);

export const COUNTRY_LABELS: Readonly<Record<string, Localized>> = Object.fromEntries(
  COUNTRIES.map((country) => [country.code, country.name]),
);

export const NOTABLE_ITEM_LABELS: Readonly<Record<string, Localized>> = {
  gym_bag: { ja: 'スポーツバッグ', en: 'Gym bag' },
  large_backpack: { ja: '大きなバックパック', en: 'Large backpack' },
  briefcase: { ja: 'ブリーフケース', en: 'Briefcase' },
  garment_bag: { ja: 'ガーメントバッグ', en: 'Garment bag' },
  stroller: { ja: 'ベビーカー', en: 'Pushchair' },
  cane: { ja: '杖', en: 'Walking cane' },
  laptop_bag: { ja: 'PC バッグ', en: 'Laptop bag' },
  tool_bag: { ja: '工具バッグ', en: 'Tool bag' },
};

export const DEMEANOR_LABELS: Readonly<Record<Demeanor, Localized>> = {
  calm: { ja: '落ち着いている', en: 'Calm' },
  nervous: { ja: 'そわそわしている', en: 'Fidgety' },
  sweating: { ja: '発汗している', en: 'Sweating' },
  irritable: { ja: 'いらだっている', en: 'Irritable' },
  evasive: { ja: '視線を合わせない', en: 'Avoiding eye contact' },
};

export const ID_KIND_LABELS: Readonly<Record<IdentityDocument['kind'], Localized>> = {
  passport: { ja: 'パスポート', en: 'Passport' },
  national_id: { ja: '国民身分証', en: 'National ID' },
  drivers_license: { ja: '運転免許証', en: 'Driver\'s licence' },
};

export const PHOTO_MATCH_LABELS: Readonly<Record<IdentityDocument['photoMatch'], Localized>> = {
  match: { ja: '一致', en: 'Match' },
  unsure: { ja: '判別しづらい', en: 'Hard to tell' },
  mismatch: { ja: '一致しない', en: 'No match' },
};

export const ANOMALY_LABELS: Readonly<Record<'expired' | 'name_variant', Localized>> = {
  expired: { ja: '有効期限切れ', en: 'Expired' },
  name_variant: { ja: '氏名の表記揺れ', en: 'Name spelled differently' },
};

export const FORGERY_LABELS: Readonly<Record<ForgeryObservation, Localized>> = {
  hologram_dim: { ja: 'ホログラムが薄い', en: 'Hologram is faint' },
  font_irregular: { ja: 'フォントが不揃い', en: 'Inconsistent typeface' },
  mrz_checksum_fail: { ja: 'MRZ の検査数字が合わない', en: 'MRZ check digit fails' },
  photo_edge_lifted: { ja: '写真の縁が浮いている', en: 'Photo edge is lifting' },
  issue_date_in_future: { ja: '発行日が未来', en: 'Issue date is in the future' },
};

export const TRIP_TYPE_LABELS: Readonly<Record<BoardingPass['tripType'], Localized>> = {
  one_way: { ja: '片道', en: 'One-way' },
  round_trip: { ja: '往復', en: 'Round trip' },
};

export const PAYMENT_LABELS: Readonly<Record<BoardingPass['payment'], Localized>> = {
  card: { ja: 'カード', en: 'Card' },
  cash: { ja: '現金', en: 'Cash' },
  points: { ja: 'ポイント', en: 'Points' },
};

export const FLAG_LABELS: Readonly<Record<ItemFlag, Localized>> = {
  liquid: { ja: '液体', en: 'Liquid' },
  tool: { ja: '工具', en: 'Tool' },
  electronics: { ja: '電子機器', en: 'Electronics' },
  suspicious: { ja: '不審', en: 'Suspicious' },
};

export const TONE_LABELS: Readonly<Record<InterviewExchange['tone'], Localized>> = {
  steady: { ja: '落ち着いた口調', en: 'Steady tone' },
  hesitant: { ja: 'ためらいがち', en: 'Hesitant' },
  defensive: { ja: '防御的', en: 'Defensive' },
};

export const MOUTH_LABELS: Readonly<Record<MouthInspection['finding'], Localized>> = {
  clear: { ja: '異常なし', en: 'Nothing unusual' },
  candy: { ja: '飴', en: 'Sweet' },
  dental_work: { ja: '歯科治療痕', en: 'Dental work' },
  wrapped_object: { ja: '包まれた小さな物体', en: 'A small wrapped object' },
  refused: { ja: '検査を拒否', en: 'Refused the inspection' },
};

export const BODY_SCAN_LABELS: Readonly<Record<BodyScanFinding, Localized>> = {
  clear: { ja: '異常なし', en: 'Nothing unusual' },
  dense_object: { ja: '高密度の物体が体内にある', en: 'A dense object inside the body' },
  organic_mass: { ja: '不自然な有機物の塊がある', en: 'An unnatural organic mass' },
  unreadable: { ja: '判読できない（体動によるブレ）', en: 'Unreadable (blurred by movement)' },
};

export interface BodyScanReadout {
  readonly headline: Localized;
  readonly detail: Localized;
  readonly region: Localized;
  readonly density: Localized;
  readonly alarming: boolean;
  /** シルエット上のホットスポット位置（コンテナに対する %）。異常がなければ null。 */
  readonly hotspot: { readonly x: number; readonly y: number } | null;
}

export const BODY_SCAN_READOUTS: Readonly<Record<BodyScanFinding, BodyScanReadout>> = {
  clear: {
    headline: { ja: '異常なし', en: 'Nothing unusual' },
    detail: {
      ja: '体内に不審な物体は検出されませんでした。ただし脅威が体内に隠すとは限りません。',
      en: 'No concealed object detected. That does not clear them of everything else.',
    },
    region: { ja: '—', en: '—' },
    density: { ja: '基準値内', en: 'Within normal range' },
    alarming: false,
    hotspot: null,
  },
  dense_object: {
    headline: { ja: '体内に銃器を隠し持っています', en: 'A firearm is concealed inside the body' },
    detail: {
      ja: '腹腔内に強い金属反応。輪郭は拳銃と一致します。拘束してください。',
      en: 'Strong metallic return in the abdomen, shaped like a handgun. Detain them.',
    },
    region: { ja: '腹部', en: 'Abdomen' },
    density: { ja: '7.8 g/cm³（金属）', en: '7.8 g/cm³ (metal)' },
    alarming: true,
    hotspot: { x: 50, y: 52 },
  },
  organic_mass: {
    headline: {
      ja: '体内に密封された包みがあります',
      en: 'Sealed packages are concealed inside the body',
    },
    detail: {
      ja: '消化管内に不自然な有機物の塊が複数。自然な内容物ではありません。拘束してください。',
      en: 'Several unnatural organic masses in the digestive tract. Not normal contents. Detain them.',
    },
    region: { ja: '消化管', en: 'Digestive tract' },
    density: { ja: '1.4 g/cm³（有機物）', en: '1.4 g/cm³ (organic)' },
    alarming: true,
    hotspot: { x: 48, y: 58 },
  },
  unreadable: {
    headline: { ja: '判読不能', en: 'Unreadable' },
    detail: {
      ja: '体動でスキャンがぶれました。この乗客の再スキャンはできません。',
      en: 'The subject moved and the scan blurred. No re-scan is available.',
    },
    region: { ja: '—', en: '—' },
    density: { ja: '測定不可', en: 'Not measurable' },
    alarming: false,
    hotspot: null,
  },
};

/** 走査で異常が出たら必ず脅威。出なくても無害とは限らない。 */
export const isConclusiveThreat = (finding: BodyScanFinding): boolean =>
  BODY_SCAN_READOUTS[finding].alarming;

export const CRIMINAL_LABELS: Readonly<Record<BackgroundRecord['criminalHistory'], Localized>> = {
  none: { ja: 'なし', en: 'None' },
  minor: { ja: '軽微', en: 'Minor' },
  serious: { ja: '重大', en: 'Serious' },
};

export const STABILITY_LABELS: Readonly<Record<ResidenceEntry['stability'], Localized>> = {
  stable: { ja: '安定', en: 'Stable' },
  unstable: { ja: '不安定', en: 'Unstable' },
  conflict: { ja: '紛争中', en: 'In conflict' },
};

export const ASPECT_LABELS: Readonly<Record<AspectId, Localized>> = {
  documents: { ja: '書類', en: 'Documents' },
  belongings: { ja: '手荷物', en: 'Belongings' },
  interview: { ja: '質問', en: 'Interview' },
  body: { ja: '身体', en: 'Body' },
  background: { ja: '経歴', en: 'Background' },
};

export const OUTCOME_LABELS: Readonly<Record<Outcome, Localized>> = {
  correct_pass: { ja: '正しく通過', en: 'Correct pass' },
  correct_detain: { ja: '正しく拘束', en: 'Correct detain' },
  false_detain: { ja: '誤検知（苦情）', en: 'False detain (complaint)' },
  missed_threat: { ja: '見逃し（ハイジャック）', en: 'Missed threat (hijacking)' },
  unavailable: { ja: '判定不能', en: 'No decision' },
};

export const INSPECTED_LABELS: Readonly<Record<InspectedItem, Localized>> = {
  identity: { ja: '身分証', en: 'ID document' },
  boarding_pass: { ja: '搭乗券', en: 'Boarding pass' },
  belongings: { ja: '手荷物', en: 'Belongings' },
  passport_inspection: { ja: 'パスポート精査', en: 'Close passport check' },
  mouth: { ja: '口内検査', en: 'Mouth inspection' },
  record: { ja: '照会', en: 'Records check' },
  residence: { ja: '居住歴', en: 'Residence history' },
  body_scan: { ja: 'X 線検査', en: 'X-ray scan' },
  'question:purpose': { ja: '質問「渡航の目的」', en: 'Question: purpose of travel' },
  'question:occupation': { ja: '質問「職業」', en: 'Question: occupation' },
  'question:bag_contents': { ja: '質問「荷物の中身」', en: 'Question: bag contents' },
  'question:who_packed': { ja: '質問「誰が荷造りしたか」', en: 'Question: who packed the bag' },
  'question:accommodation': { ja: '質問「滞在先」', en: 'Question: accommodation' },
  'question:follow_up': { ja: '追い質問', en: 'Follow-up question' },
};

export const formatDuration = (ms: number, locale: Locale): string => {
  if (ms < 10_000) {
    return locale === 'ja' ? `${(ms / 1000).toFixed(2)} 秒` : `${(ms / 1000).toFixed(2)}s`;
  }
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (locale === 'ja') {
    return minutes === 0 ? `${seconds} 秒` : `${minutes} 分 ${seconds} 秒`;
  }
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${seconds}s`;
};
