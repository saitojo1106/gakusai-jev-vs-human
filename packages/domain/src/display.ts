import { COUNTRIES } from './content/countries.js';
import { ITEMS } from './content/items.js';
import { PURPOSE_LABELS } from './content/questions.js';
import type {
  AspectId,
  BackgroundRecord,
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
export { moodOf, passengerImage } from './content/archetypes.js';
export { PURPOSE_LABELS };

export const ITEM_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  ITEMS.map((item) => [item.kind, item.label]),
);

export const COUNTRY_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  COUNTRIES.map((country) => [country.code, country.name]),
);

export const DEMEANOR_LABELS: Readonly<Record<Demeanor, string>> = {
  calm: '落ち着いている',
  nervous: 'そわそわしている',
  sweating: '発汗している',
  irritable: 'いらだっている',
  evasive: '視線を合わせない',
};

export const ID_KIND_LABELS: Readonly<Record<IdentityDocument['kind'], string>> = {
  passport: 'パスポート',
  national_id: '国民身分証',
  drivers_license: '運転免許証',
};

export const PHOTO_MATCH_LABELS: Readonly<Record<IdentityDocument['photoMatch'], string>> = {
  match: '一致',
  unsure: '判別しづらい',
  mismatch: '一致しない',
};

export const ANOMALY_LABELS: Readonly<Record<'expired' | 'name_variant', string>> = {
  expired: '有効期限切れ',
  name_variant: '氏名の表記揺れ',
};

export const FORGERY_LABELS: Readonly<Record<ForgeryObservation, string>> = {
  hologram_dim: 'ホログラムが薄い',
  font_irregular: 'フォントが不揃い',
  mrz_checksum_fail: 'MRZ の検査数字が合わない',
  photo_edge_lifted: '写真の縁が浮いている',
  issue_date_in_future: '発行日が未来',
};

export const TRIP_TYPE_LABELS: Readonly<Record<BoardingPass['tripType'], string>> = {
  one_way: '片道',
  round_trip: '往復',
};

export const PAYMENT_LABELS: Readonly<Record<BoardingPass['payment'], string>> = {
  card: 'カード',
  cash: '現金',
  points: 'ポイント',
};

export const FLAG_LABELS: Readonly<Record<ItemFlag, string>> = {
  liquid: '液体',
  tool: '工具',
  electronics: '電子機器',
  suspicious: '不審',
};

export const TONE_LABELS: Readonly<Record<InterviewExchange['tone'], string>> = {
  steady: '落ち着いた口調',
  hesitant: 'ためらいがち',
  defensive: '防御的',
};

export const MOUTH_LABELS: Readonly<Record<MouthInspection['finding'], string>> = {
  clear: '異常なし',
  candy: '飴',
  dental_work: '歯科治療痕',
  wrapped_object: '包まれた小さな物体',
  refused: '検査を拒否',
};

export const CRIMINAL_LABELS: Readonly<Record<BackgroundRecord['criminalHistory'], string>> = {
  none: 'なし',
  minor: '軽微',
  serious: '重大',
};

export const STABILITY_LABELS: Readonly<Record<ResidenceEntry['stability'], string>> = {
  stable: '安定',
  unstable: '不安定',
  conflict: '紛争中',
};

export const ASPECT_LABELS: Readonly<Record<AspectId, string>> = {
  documents: '書類',
  belongings: '手荷物',
  interview: '質問',
  body: '身体',
  background: '経歴',
};

export const OUTCOME_LABELS: Readonly<Record<Outcome, string>> = {
  correct_pass: '正しく通過',
  correct_detain: '正しく拘束',
  false_detain: '誤検知（苦情）',
  missed_threat: '見逃し（ハイジャック）',
  unavailable: '判定不能',
};

export const INSPECTED_LABELS: Readonly<Record<InspectedItem, string>> = {
  identity: '身分証',
  boarding_pass: '搭乗券',
  belongings: '手荷物',
  passport_inspection: 'パスポート精査',
  mouth: '口内検査',
  record: '照会',
  residence: '居住歴',
  'question:purpose': '質問「渡航の目的」',
  'question:occupation': '質問「職業」',
  'question:bag_contents': '質問「荷物の中身」',
  'question:who_packed': '質問「誰が荷造りしたか」',
  'question:accommodation': '質問「滞在先」',
  'question:follow_up': '追い質問',
};

export const formatDuration = (ms: number): string => {
  if (ms < 10_000) return `${(ms / 1000).toFixed(2)} 秒`;
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes === 0 ? `${seconds} 秒` : `${minutes} 分 ${seconds} 秒`;
};
