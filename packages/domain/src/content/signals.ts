import type { DossierDraft } from '../draft.js';
import type { Localized } from '../i18n.js';
import type { Prng } from '../services/prng.js';
import type { ForgeryObservation, InspectedItem, SignalId } from '../types.js';
import { COUNTRIES_BY_STABILITY } from './countries.js';
import { SUSPICIOUS_ITEMS, TOOL_ITEMS } from './items.js';
import { PACKED_BY } from './questions.js';

export interface Signal {
  readonly id: SignalId;
  readonly label: Localized;
  readonly pThreat: number;
  readonly pBenign: number;
  readonly group?: string;
  readonly revealedBy: readonly InspectedItem[];
  readonly apply: (draft: DossierDraft, rng: Prng) => void;
}

export const FORGERY_OBSERVATIONS: readonly ForgeryObservation[] = [
  'hologram_dim',
  'font_irregular',
  'mrz_checksum_fail',
  'photo_edge_lifted',
  'issue_date_in_future',
];

export const SIGNALS: readonly Signal[] = [
  {
    id: 'one_way_cash_lastminute' as SignalId,
    label: { ja: '片道・現金・直前購入', en: 'One-way, cash, bought last minute' },
    pThreat: 0.55,
    pBenign: 0.05,
    revealedBy: ['boarding_pass'],
    apply: (draft) => {
      draft.boardingPass.tripType = 'one_way';
      draft.boardingPass.payment = 'cash';
      draft.boardingPass.purchasedDaysBefore = 0;
      draft.boardingPass.checkedBags = 0;
    },
  },
  {
    id: 'purpose_item_mismatch' as SignalId,
    label: { ja: '渡航目的と持ち物の不一致', en: 'Belongings do not match stated purpose' },
    pThreat: 0.6,
    pBenign: 0.1,
    revealedBy: ['belongings', 'question:purpose', 'question:bag_contents'],
    apply: (draft, rng) => {
      const mismatched = TOOL_ITEMS.filter((t) => !t.fitsPurposes.includes(draft.purpose.stated));
      const pool = mismatched.length > 0 ? mismatched : SUSPICIOUS_ITEMS;
      for (const entry of rng.sample(pool, rng.int(1, 3))) {
        draft.belongings.push({
          kind: entry.kind,
          quantity: rng.int(1, entry.maxQuantity + 1),
          flags: [...entry.flags],
        });
      }
    },
  },
  {
    id: 'interview_contradiction' as SignalId,
    label: { ja: '質問の回答の食い違い', en: 'Contradictory answers' },
    pThreat: 0.5,
    pBenign: 0.08,
    revealedBy: ['question:follow_up', 'question:who_packed', 'question:bag_contents'],
    apply: (draft) => {
      draft.contradiction = true;
      draft.packedBy = PACKED_BY[3] as Localized;
    },
  },
  {
    id: 'forged_passport' as SignalId,
    label: { ja: '偽造された身分証', en: 'Forged identity document' },
    pThreat: 0.45,
    pBenign: 0.03,
    revealedBy: ['passport_inspection'],
    apply: (draft, rng) => {
      draft.identity.inspection = rng.sample(FORGERY_OBSERVATIONS, rng.int(2, 4));
      draft.identity.photoMatch = rng.bool(0.5) ? 'unsure' : 'mismatch';
    },
  },
  {
    id: 'mouth_wrapped_object' as SignalId,
    label: { ja: '口内に包まれた物体', en: 'Wrapped object in the mouth' },
    pThreat: 0.25,
    pBenign: 0.02,
    group: 'mouth',
    revealedBy: ['mouth'],
    apply: (draft) => {
      draft.mouth.finding = 'wrapped_object';
    },
  },
  {
    id: 'body_scan_anomaly' as SignalId,
    label: { ja: '体内に隠されたもの', en: 'Something hidden inside the body' },
    pThreat: 0.45,
    // X 線は 1 シフト 1 回の必殺技なので、無害な乗客には絶対に出さない。
    // 見つかれば確実に脅威。ただし脅威の 55% は何も出ないので万能ではない。
    pBenign: 0,
    revealedBy: ['body_scan'],
    apply: (draft, rng) => {
      draft.bodyScan.finding = rng.bool(0.6) ? 'dense_object' : 'organic_mass';
    },
  },
  {
    id: 'watchlist_hit' as SignalId,
    label: { ja: '監視リスト該当', en: 'Watchlist hit' },
    pThreat: 0.35,
    pBenign: 0.02,
    revealedBy: ['record'],
    apply: (draft) => {
      draft.record.watchlistHit = true;
    },
  },
  {
    id: 'nervous_demeanor' as SignalId,
    label: { ja: '発汗・そわそわ', en: 'Sweating and fidgeting' },
    pThreat: 0.4,
    pBenign: 0.25,
    revealedBy: [],
    apply: (draft, rng) => {
      draft.appearance.demeanor = rng.pick(['sweating', 'nervous'] as const);
    },
  },
  {
    id: 'mouth_refused' as SignalId,
    label: { ja: '口内検査の拒否', en: 'Refused the mouth inspection' },
    pThreat: 0.2,
    pBenign: 0.1,
    group: 'mouth',
    revealedBy: ['mouth'],
    apply: (draft) => {
      draft.mouth.finding = 'refused';
    },
  },
  {
    id: 'conflict_residence' as SignalId,
    label: { ja: '紛争地域の居住歴', en: 'Lived in a conflict zone' },
    pThreat: 0.35,
    pBenign: 0.2,
    revealedBy: ['residence'],
    apply: (draft, rng) => {
      const country = rng.pick(COUNTRIES_BY_STABILITY.conflict);
      if (draft.residenceHistory.some((r) => r.country === country.code)) return;
      draft.residenceHistory[rng.int(0, draft.residenceHistory.length)] = {
        country: country.code,
        years: rng.int(1, 9),
        stability: country.stability,
      };
    },
  },
  {
    id: 'expired_document' as SignalId,
    label: { ja: '身分証の期限切れ', en: 'Expired identity document' },
    pThreat: 0.2,
    pBenign: 0.15,
    revealedBy: ['identity'],
    apply: (draft, rng) => {
      if (!draft.identity.anomalies.includes('expired')) draft.identity.anomalies.push('expired');
      draft.identity.expiresOn = `202${rng.int(4, 6)}-0${rng.int(1, 9)}-1${rng.int(0, 9)}`;
    },
  },
  {
    id: 'minor_record' as SignalId,
    label: { ja: '軽微な前歴', en: 'Minor criminal record' },
    pThreat: 0.3,
    pBenign: 0.2,
    revealedBy: ['record'],
    apply: (draft) => {
      if (draft.record.criminalHistory === 'none') draft.record.criminalHistory = 'minor';
    },
  },
];

export const signalOf = (id: SignalId | string): Signal | undefined =>
  SIGNALS.find((s) => s.id === id);
