import type { ItemFlag, TravelPurpose } from '../types.js';

export interface ItemCatalogEntry {
  readonly kind: string;
  readonly label: string;
  readonly flags: readonly ItemFlag[];
  readonly fitsPurposes: readonly TravelPurpose['stated'][];
  readonly maxQuantity: number;
}

const item = (
  kind: string,
  label: string,
  flags: readonly ItemFlag[],
  fitsPurposes: readonly TravelPurpose['stated'][],
  maxQuantity = 1,
): ItemCatalogEntry => ({ kind, label, flags, fitsPurposes, maxQuantity });

export const ITEMS: readonly ItemCatalogEntry[] = [
  item('laptop', 'ノート PC', ['electronics'], ['business', 'study', 'tourism'], 1),
  item('tablet', 'タブレット', ['electronics'], ['business', 'study', 'tourism', 'family'], 1),
  item('camera', 'カメラ', ['electronics'], ['tourism', 'business'], 2),
  item('water_bottle', '水筒', ['liquid'], ['tourism', 'business', 'family', 'study', 'relocation', 'other'], 2),
  item('cosmetics', '化粧品', ['liquid'], ['tourism', 'family', 'business', 'other'], 3),
  item('medicine', '常備薬', ['liquid'], ['tourism', 'family', 'business', 'study', 'relocation', 'other'], 2),
  item('guidebook', 'ガイドブック', [], ['tourism'], 2),
  item('textbook', '教科書', [], ['study'], 3),
  item('toys', '子ども用おもちゃ', [], ['family'], 3),
  item('suit', 'スーツ', [], ['business', 'family'], 2),
  item('sportswear', 'スポーツウェア', [], ['tourism', 'business'], 2),
  item('wrench', 'レンチ', ['tool'], ['relocation'], 3),
  item('screwdriver_set', 'ドライバーセット', ['tool'], ['relocation'], 2),
  item('wire_cutter', 'ワイヤーカッター', ['tool'], ['relocation'], 1),
  item('duct_tape', 'ダクトテープ', ['tool'], ['relocation'], 3),
  item('spare_battery', '予備バッテリー', ['electronics'], ['business', 'tourism', 'study'], 4),
  item('radio_module', '無線モジュール', ['electronics', 'suspicious'], [], 2),
  item('unmarked_vial', 'ラベルのない小瓶', ['liquid', 'suspicious'], [], 3),
  item('folded_blueprint', '折りたたまれた図面', ['suspicious'], [], 1),
  item('zip_ties', '結束バンド', ['tool', 'suspicious'], [], 5),
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
