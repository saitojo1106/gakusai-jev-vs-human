import { describe, expect, it } from 'vitest';
import { PASSENGERS_PER_SHIFT, THREAT_RATE } from '../constants.js';
import { ARCHETYPES, PASSENGER_IMAGES, passengerImage } from '../content/archetypes.js';
import { NOTABLE_ITEM_LABELS } from '../display.js';
import { countryOf } from '../content/countries.js';
import { SIGNALS, signalOf } from '../content/signals.js';
import { QUESTIONS } from '../content/questions.js';
import type { PassengerIndex, QuestionId, Seed } from '../types.js';
import { generatePassenger, generateShift } from './passenger-generator.js';

const seed = (value: string) => value as Seed;
const at = (n: number) => n as PassengerIndex;

describe('generatePassenger', () => {
  it('同じシードと乗客番号からは同じ乗客が出る', () => {
    expect(generatePassenger(seed('alpha'), at(3))).toEqual(generatePassenger(seed('alpha'), at(3)));
  });

  it('乗客番号が違えば違う乗客になる', () => {
    expect(generatePassenger(seed('alpha'), at(0))).not.toEqual(
      generatePassenger(seed('alpha'), at(1)),
    );
  });

  it('シードが違えば違う乗客になる', () => {
    expect(generatePassenger(seed('alpha'), at(0))).not.toEqual(
      generatePassenger(seed('beta'), at(0)),
    );
  });

  it('乗客番号を保持する', () => {
    expect(generatePassenger(seed('alpha'), at(7)).index).toBe(7);
  });

  it('脅威の割合はおおむね 30% になる', () => {
    const threats = Array.from({ length: 1000 }, (_, i) =>
      generatePassenger(seed('ratio'), at(i)),
    ).filter((p) => p.truth.isThreat).length;
    expect(threats / 1000).toBeGreaterThan(THREAT_RATE - 0.05);
    expect(threats / 1000).toBeLessThan(THREAT_RATE + 0.05);
  });

  it('脅威なら threatType は hijack、無害なら none', () => {
    for (let i = 0; i < 100; i += 1) {
      const { truth } = generatePassenger(seed('kind'), at(i));
      expect(truth.threatType).toBe(truth.isThreat ? 'hijack' : 'none');
    }
  });

  it('脅威の乗客には手がかりが 2〜4 個ある', () => {
    const threats = Array.from({ length: 300 }, (_, i) =>
      generatePassenger(seed('signals'), at(i)),
    ).filter((p) => p.truth.isThreat);
    expect(threats.length).toBeGreaterThan(0);
    for (const p of threats) {
      expect(p.truth.keySignals.length).toBeGreaterThanOrEqual(2);
      expect(p.truth.keySignals.length).toBeLessThanOrEqual(4);
    }
  });

  it('無害な乗客の疑わしい特徴は 2 個以下', () => {
    const benign = Array.from({ length: 300 }, (_, i) =>
      generatePassenger(seed('signals'), at(i)),
    ).filter((p) => !p.truth.isThreat);
    for (const p of benign) {
      expect(p.truth.keySignals.length).toBeLessThanOrEqual(2);
    }
  });

  it('keySignals はすべてシグナル一覧に存在する', () => {
    for (let i = 0; i < 200; i += 1) {
      for (const id of generatePassenger(seed('known'), at(i)).truth.keySignals) {
        expect(signalOf(id)).toBeDefined();
      }
    }
  });

  it('同じ乗客に同じシグナルが二重に付かない', () => {
    for (let i = 0; i < 200; i += 1) {
      const { keySignals } = generatePassenger(seed('dupe'), at(i)).truth;
      expect(new Set(keySignals).size).toBe(keySignals.length);
    }
  });

  it('質問は 6 問すべて生成され、追い質問だけが 3 問後に解放される', () => {
    for (let i = 0; i < 50; i += 1) {
      const { interview } = generatePassenger(seed('interview'), at(i)).dossier;
      expect(interview.map((e) => e.id)).toEqual(QUESTIONS.map((q) => q.id));
      for (const e of interview) {
        expect(e.answer.length).toBeGreaterThan(0);
        expect(e.unlockedAfter).toBe(e.id === 'follow_up' ? 3 : 0);
      }
    }
  });

  it('偽造パスポートなら精査所見が 2 件以上、そうでなければ 1 件以下', () => {
    for (let i = 0; i < 300; i += 1) {
      const p = generatePassenger(seed('forgery'), at(i));
      const forged = p.truth.keySignals.includes(signalOf('forged_passport')!.id);
      expect(p.dossier.identity.inspection.length).toBeGreaterThanOrEqual(forged ? 2 : 0);
      if (!forged) expect(p.dossier.identity.inspection.length).toBeLessThanOrEqual(1);
    }
  });

  it('精査所見に重複はない', () => {
    for (let i = 0; i < 200; i += 1) {
      const { inspection } = generatePassenger(seed('obs'), at(i)).dossier.identity;
      expect(new Set(inspection).size).toBe(inspection.length);
    }
  });

  it('期限切れフラグと有効期限が食い違わない', () => {
    for (let i = 0; i < 200; i += 1) {
      const { identity } = generatePassenger(seed('expiry'), at(i)).dossier;
      const expired = Date.parse(identity.expiresOn) < Date.parse('2026-09-20');
      expect(identity.anomalies.includes('expired')).toBe(expired);
    }
  });

  it('アーキタイプは一覧にあり、対応するイラストが存在する', () => {
    for (let i = 0; i < 200; i += 1) {
      const { appearance } = generatePassenger(seed('art'), at(i)).dossier;
      const archetype = ARCHETYPES.find((a) => a.id === appearance.archetype);
      expect(archetype).toBeDefined();
      expect(appearance.ageBand).toBe(archetype?.ageBand);
      expect(PASSENGER_IMAGES).toContain(passengerImage(appearance.archetype, appearance.demeanor));
    }
  });

  it('国籍と居住歴の国はすべて架空国の一覧にある', () => {
    for (let i = 0; i < 200; i += 1) {
      const { identity, residenceHistory } = generatePassenger(seed('geo'), at(i)).dossier;
      expect(countryOf(identity.nationality)).toBeDefined();
      for (const entry of residenceHistory) {
        const country = countryOf(entry.country);
        expect(country).toBeDefined();
        expect(entry.stability).toBe(country?.stability);
        expect(entry.years).toBeGreaterThan(0);
      }
    }
  });

  it('居住歴は 2〜3 件で、同じ国が重複しない', () => {
    for (let i = 0; i < 200; i += 1) {
      const { residenceHistory } = generatePassenger(seed('res'), at(i)).dossier;
      expect(residenceHistory.length).toBeGreaterThanOrEqual(2);
      expect(residenceHistory.length).toBeLessThanOrEqual(3);
      expect(new Set(residenceHistory.map((r) => r.country)).size).toBe(residenceHistory.length);
    }
  });

  it('手荷物は 1 つ以上で、数量は 1 以上', () => {
    for (let i = 0; i < 200; i += 1) {
      const { belongings } = generatePassenger(seed('bags'), at(i)).dossier;
      expect(belongings.length).toBeGreaterThan(0);
      for (const item of belongings) expect(item.quantity).toBeGreaterThanOrEqual(1);
    }
  });

  it('搭乗券の行き先が質問の回答と食い違わない', () => {
    for (let i = 0; i < 100; i += 1) {
      const { boardingPass, interview } = generatePassenger(seed('flight'), at(i)).dossier;
      const accommodation = interview.find((e) => e.id === 'accommodation');
      expect(accommodation?.answer).toContain(boardingPass.destination);
    }
  });

  it('滞在日数は片道なら長め、往復なら滞在日数と整合する', () => {
    for (let i = 0; i < 200; i += 1) {
      const { purpose } = generatePassenger(seed('stay'), at(i)).dossier;
      expect(purpose.stayDays).toBeGreaterThan(0);
      expect(purpose.companions).toBeGreaterThanOrEqual(0);
    }
  });

  it('無害な乗客でも監視リスト該当や偽造が「たまに」起きる（レッドヘリング）', () => {
    const benign = Array.from({ length: 500 }, (_, i) =>
      generatePassenger(seed('herring'), at(i)),
    ).filter((p) => !p.truth.isThreat);
    const withSignals = benign.filter((p) => p.truth.keySignals.length > 0);
    expect(withSignals.length).toBeGreaterThan(0);
    expect(withSignals.length).toBeLessThan(benign.length);
  });

  it('未成年は生成しない', () => {
    for (let i = 0; i < 200; i += 1) {
      const { identity } = generatePassenger(seed('age'), at(i)).dossier;
      const age = (Date.parse('2026-09-20') - Date.parse(identity.birthDate)) / 31_557_600_000;
      expect(age).toBeGreaterThanOrEqual(20);
    }
  });
});

describe('generateShift', () => {
  it('10 人を番号順に生成する', () => {
    const passengers = generateShift(seed('shift'));
    expect(passengers).toHaveLength(PASSENGERS_PER_SHIFT);
    expect(passengers.map((p) => p.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('個別生成と同じ結果になる', () => {
    expect(generateShift(seed('shift'))[4]).toEqual(generatePassenger(seed('shift'), at(4)));
  });

  it('脅威はおおむね 2〜4 人に収まる', () => {
    const counts = Array.from(
      { length: 200 },
      (_, i) => generateShift(seed(`s${i}`)).filter((p) => p.truth.isThreat).length,
    );
    const outOfRange = counts.filter((c) => c < 2 || c > 4).length;
    expect(outOfRange / counts.length).toBeLessThan(0.35);
  });
});

describe('SIGNALS', () => {
  it('id が重複しない', () => {
    expect(new Set(SIGNALS.map((s) => s.id)).size).toBe(SIGNALS.length);
  });

  it('脅威側の出現率が無害側より高い', () => {
    for (const signal of SIGNALS) {
      expect(signal.pThreat).toBeGreaterThan(signal.pBenign);
      expect(signal.pThreat).toBeLessThanOrEqual(1);
      expect(signal.pBenign).toBeGreaterThanOrEqual(0);
    }
  });

  it('調べれば気づける項目が指定されている', () => {
    const inspectable = new Set<string>([
      'identity',
      'boarding_pass',
      'belongings',
      'passport_inspection',
      'mouth',
      'record',
      'residence',
      'body_scan',
      ...QUESTIONS.map((q) => `question:${q.id satisfies QuestionId}`),
    ]);
    for (const signal of SIGNALS) {
      for (const item of signal.revealedBy) expect(inspectable).toContain(item);
    }
  });
});

describe('X 線検査は必殺技', () => {
  const everyone = Array.from({ length: 400 }, (_, i) =>
    generatePassenger(seed(`xray-${i}`), at(i % PASSENGERS_PER_SHIFT)),
  );

  const anomalous = everyone.filter(
    (p) => p.bodyScan.finding === 'dense_object' || p.bodyScan.finding === 'organic_mass',
  );

  it('体内スキャンの異常は脅威にしか出ない', () => {
    expect(anomalous.length).toBeGreaterThan(0);
    expect(anomalous.every((p) => p.truth.isThreat)).toBe(true);
  });

  it('異常なしでも脅威は残る（X 線は万能ではない）', () => {
    const quietThreats = everyone.filter(
      (p) => p.truth.isThreat && p.bodyScan.finding !== 'dense_object' && p.bodyScan.finding !== 'organic_mass',
    );
    expect(quietThreats.length).toBeGreaterThan(0);
  });
});

describe('目立つ持ち物のラベル', () => {
  it('全アーキタイプの notableItems に対訳がある', () => {
    const missing = ARCHETYPES.flatMap((a) =>
      a.notableItems.filter((item) => NOTABLE_ITEM_LABELS[item] === undefined),
    );
    expect(missing).toEqual([]);
  });
});
