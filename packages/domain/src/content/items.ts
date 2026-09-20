import type { Localized } from '../i18n.js';
import type { ItemFlag, TravelPurpose } from '../types.js';

export interface ItemCatalogEntry {
  readonly kind: string;
  readonly label: Localized;
  readonly flags: readonly ItemFlag[];
  readonly fitsPurposes: readonly TravelPurpose['stated'][];
  readonly maxQuantity: number;
}

const item = (
  kind: string,
  ja: string,
  en: string,
  flags: readonly ItemFlag[],
  fitsPurposes: readonly TravelPurpose['stated'][],
  maxQuantity = 1,
): ItemCatalogEntry => ({ kind, label: { ja, en }, flags, fitsPurposes, maxQuantity });

export const ITEMS: readonly ItemCatalogEntry[] = [
  item('laptop', 'ノート PC', 'Laptop', ['electronics'], ['business', 'study', 'tourism'], 1),
  item('tablet', 'タブレット', 'Tablet', ['electronics'], ['business', 'study', 'tourism', 'family'], 1),
  item('camera', 'カメラ', 'Camera', ['electronics'], ['tourism', 'business'], 2),
  item('water_bottle', '水筒', 'Water bottle', ['liquid'], ['tourism', 'business', 'family', 'study', 'relocation', 'other'], 2),
  item('cosmetics', '化粧品', 'Cosmetics', ['liquid'], ['tourism', 'family', 'business', 'other'], 3),
  item('medicine', '常備薬', 'Medication', ['liquid'], ['tourism', 'family', 'business', 'study', 'relocation', 'other'], 2),
  item('guidebook', 'ガイドブック', 'Guidebook', [], ['tourism'], 2),
  item('textbook', '教科書', 'Textbook', [], ['study'], 3),
  item('toys', '子ども用おもちゃ', "Children's toys", [], ['family'], 3),
  item('suit', 'スーツ', 'Suit', [], ['business', 'family'], 2),
  item('sportswear', 'スポーツウェア', 'Sportswear', [], ['tourism', 'business'], 2),
  item('wrench', 'レンチ', 'Wrench', ['tool'], ['relocation'], 3),
  item('screwdriver_set', 'ドライバーセット', 'Screwdriver set', ['tool'], ['relocation'], 2),
  item('wire_cutter', 'ワイヤーカッター', 'Wire cutter', ['tool'], ['relocation'], 1),
  item('duct_tape', 'ダクトテープ', 'Duct tape', ['tool'], ['relocation'], 3),
  item('spare_battery', '予備バッテリー', 'Spare battery', ['electronics'], ['business', 'tourism', 'study'], 4),
  item('radio_module', '無線モジュール', 'Radio module', ['electronics', 'suspicious'], [], 2),
  item('unmarked_vial', 'ラベルのない小瓶', 'Unmarked vial', ['liquid', 'suspicious'], [], 3),
  item('folded_blueprint', '折りたたまれた図面', 'Folded blueprint', ['suspicious'], [], 1),
  item('zip_ties', '結束バンド', 'Zip ties', ['tool', 'suspicious'], [], 5),
];

export const itemOf = (kind: string): ItemCatalogEntry | undefined =>
  ITEMS.find((i) => i.kind === kind);

export const ORDINARY_ITEMS: readonly ItemCatalogEntry[] = ITEMS.filter(
  (i) => !i.flags.includes('suspicious'),
);

export const TOOL_ITEMS: readonly ItemCatalogEntry[] = ITEMS.filter((i) => i.flags.includes('tool'));

export const SUSPICIOUS_ITEMS: readonly ItemCatalogEntry[] = ITEMS.filter((i) =>
  i.flags.includes('suspicious'),
);

export const itemsFor = (purpose: TravelPurpose['stated']): readonly ItemCatalogEntry[] =>
  ORDINARY_ITEMS.filter((i) => i.fitsPurposes.includes(purpose));
