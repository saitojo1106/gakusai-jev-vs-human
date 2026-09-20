import { PASSENGERS_PER_SHIFT, REFERENCE_DATE, THREAT_RATE } from '../constants.js';
import { ARCHETYPES, type Archetype } from '../content/archetypes.js';
import { COUNTRIES_BY_STABILITY, DESTINATIONS } from '../content/countries.js';
import { ITEMS, itemOf, itemsFor } from '../content/items.js';
import { FAMILY_NAMES, GIVEN_NAMES } from '../content/names.js';
import {
  ACCOMMODATIONS,
  OCCUPATIONS,
  PACKED_BY,
  PURPOSE_LABELS,
  QUESTIONS,
} from '../content/questions.js';
import { type Signal, SIGNALS, signalOf } from '../content/signals.js';
import { type DossierDraft, freezeDossier } from '../draft.js';
import type {
  Demeanor,
  InspectedItem,
  Passenger,
  PassengerIndex,
  Seed,
  SignalId,
  TravelPurpose,
  Truth,
} from '../types.js';
import { createPrng, type Prng } from './prng.js';

const REFERENCE_YEAR = Number(REFERENCE_DATE.slice(0, 4));

const pad2 = (value: number): string => String(value).padStart(2, '0');

const STAY_DAYS: Readonly<Record<TravelPurpose['stated'], readonly [number, number]>> = {
  tourism: [2, 11],
  business: [1, 6],
  family: [3, 15],
  study: [60, 366],
  relocation: [90, 366],
  other: [1, 31],
};

const ageFor = (band: Archetype['ageBand'], rng: Prng): number =>
  band === '60s+' ? rng.int(60, 76) : rng.int(Number(band.slice(0, 2)), Number(band.slice(0, 2)) + 10);

const baseDemeanor = (rng: Prng): Demeanor =>
  rng.pick(['calm', 'calm', 'calm', 'nervous', 'irritable', 'evasive'] as const);

const buildBase = (rng: Prng): DossierDraft => {
  const archetype = rng.pick(ARCHETYPES);
  const purpose = rng.pick(archetype.purposes);
  const [minStay, maxStay] = STAY_DAYS[purpose];
  const nationality = rng.pick([
    ...COUNTRIES_BY_STABILITY.stable,
    ...COUNTRIES_BY_STABILITY.unstable,
  ]);
  const residences = rng.sample(
    [...COUNTRIES_BY_STABILITY.stable, ...COUNTRIES_BY_STABILITY.unstable],
    rng.int(2, 4),
  );
  const itemPool = itemsFor(purpose);
  const belongings = rng.sample(itemPool.length >= 2 ? itemPool : ITEMS, rng.int(2, 5));
  const tripType = rng.bool(0.7) ? 'round_trip' : 'one_way';

  return {
    appearance: {
      ageBand: archetype.ageBand,
      archetype: archetype.id,
      demeanor: baseDemeanor(rng),
      notableItems: [...archetype.notableItems],
    },
    identity: {
      kind: rng.pick(['passport', 'passport', 'national_id', 'drivers_license'] as const),
      fullName: `${rng.pick(GIVEN_NAMES)} ${rng.pick(FAMILY_NAMES)}`,
      nationality: nationality.code,
      birthDate: `${REFERENCE_YEAR - ageFor(archetype.ageBand, rng)}-01-15`,
      expiresOn: `${rng.int(REFERENCE_YEAR + 1, REFERENCE_YEAR + 8)}-${pad2(rng.int(1, 13))}-${pad2(rng.int(1, 29))}`,
      photoMatch: rng.bool(0.85) ? 'match' : 'unsure',
      anomalies: rng.bool(0.1) ? ['name_variant'] : [],
      inspection: rng.bool(0.12) ? ['hologram_dim'] : [],
    },
    boardingPass: {
      flightNo: `JV${rng.int(100, 1000)}`,
      destination: rng.pick(DESTINATIONS),
      seat: `${rng.int(1, 41)}${rng.pick(['A', 'B', 'C', 'D', 'E', 'F'] as const)}`,
      tripType,
      payment: rng.pick(['card', 'card', 'card', 'points', 'cash'] as const),
      purchasedDaysBefore: rng.int(1, 61),
      checkedBags: rng.int(0, 3),
    },
    belongings: belongings.map((entry) => ({
      kind: entry.kind,
      quantity: rng.int(1, entry.maxQuantity + 1),
      flags: [...entry.flags],
    })),
    purpose: {
      stated: purpose,
      stayDays: rng.int(minStay, maxStay),
      companions: purpose === 'family' ? rng.int(1, 4) : rng.int(0, 2),
    },
    interview: [],
    mouth: { finding: rng.pick(['clear', 'clear', 'clear', 'candy', 'dental_work'] as const) },
    bodyScan: { finding: rng.bool(0.08) ? 'unreadable' : 'clear' },
    record: {
      criminalHistory: 'none',
      watchlistHit: false,
      tripsLastYear: rng.int(0, 9),
    },
    residenceHistory: residences.map((country) => ({
      country: country.code,
      years: rng.int(1, 21),
      stability: country.stability,
    })),
    occupation: rng.pick(OCCUPATIONS[purpose]),
    accommodation: rng.pick(ACCOMMODATIONS),
    packedBy: rng.pick(PACKED_BY.slice(0, 3)),
    contradiction: false,
  };
};

const withoutGroupClashes = (rng: Prng, signals: readonly Signal[]): Signal[] => {
  const taken = new Set<string>();
  const kept: Signal[] = [];
  for (const signal of rng.shuffle(signals)) {
    if (signal.group !== undefined && taken.has(signal.group)) continue;
    if (signal.group !== undefined) taken.add(signal.group);
    kept.push(signal);
  }
  return kept;
};

const weightedPick = (rng: Prng, signals: readonly Signal[]): Signal => {
  const total = signals.reduce((sum, s) => sum + s.pThreat, 0);
  let cursor = rng.next() * total;
  for (const signal of signals) {
    cursor -= signal.pThreat;
    if (cursor <= 0) return signal;
  }
  return signals[signals.length - 1] as Signal;
};

const selectSignals = (rng: Prng, isThreat: boolean): Signal[] => {
  const rolled = SIGNALS.filter((s) => rng.bool(isThreat ? s.pThreat : s.pBenign));
  let chosen = withoutGroupClashes(rng, rolled);

  if (isThreat) {
    while (chosen.length < 2) {
      const groups = new Set(chosen.map((s) => s.group).filter((g) => g !== undefined));
      const pool = SIGNALS.filter(
        (s) => !chosen.includes(s) && (s.group === undefined || !groups.has(s.group)),
      );
      if (pool.length === 0) break;
      chosen.push(weightedPick(rng, pool));
    }
    if (chosen.length > 4) chosen = rng.sample(chosen, 4);
  } else if (chosen.length > 2) {
    chosen = rng.sample(chosen, 2);
  }

  return chosen.sort((a, b) => SIGNALS.indexOf(a) - SIGNALS.indexOf(b));
};

const composeInterview = (draft: DossierDraft, rng: Prng): void => {
  const labels = draft.belongings.map((b) => itemOf(b.kind)?.label ?? b.kind);
  const tools = draft.belongings.filter((b) => b.flags.includes('tool'));
  const suspicious = draft.belongings.filter((b) => b.flags.includes('suspicious'));
  const mismatch =
    (tools.length > 0 && draft.purpose.stated !== 'relocation') || suspicious.length > 0;
  const unsettled =
    draft.appearance.demeanor === 'nervous' || draft.appearance.demeanor === 'sweating';
  const tone = unsettled ? 'hesitant' : 'steady';

  const stay = `${draft.purpose.stayDays} 日ほど滞在します`;
  const accommodation =
    draft.accommodation === 'まだ決めていません'
      ? `${draft.boardingPass.destination}に着いてから決めます`
      : `${draft.boardingPass.destination}近くの${draft.accommodation}です`;

  const followUp = draft.contradiction
    ? {
        question: '荷造りはご自身でと伺いましたが、預かった荷物があるのは？',
        answer: '……中身までは確認していません。頼まれただけです。',
        tone: 'defensive' as const,
      }
    : mismatch
      ? {
          question: `さきほど${PURPOSE_LABELS[draft.purpose.stated]}と伺いましたが、荷物に${labels.find((l, i) => draft.belongings[i]?.flags.includes('tool') || draft.belongings[i]?.flags.includes('suspicious')) ?? 'この道具'}があるのはなぜですか？`,
          answer: '仕事で使うものです。いつも持ち歩いています。',
          tone: 'hesitant' as const,
        }
      : {
          question: QUESTIONS[QUESTIONS.length - 1]?.question ?? '',
          answer: '食い違っている点はないと思いますが。',
          tone: 'steady' as const,
        };

  const answers: Readonly<Record<string, { answer: string; tone: 'steady' | 'hesitant' | 'defensive' }>> = {
    purpose: {
      answer: `${PURPOSE_LABELS[draft.purpose.stated]}です。${stay}。`,
      tone,
    },
    occupation: { answer: `${draft.occupation}です。`, tone },
    bag_contents: { answer: `${labels.join('、')}が入っています。`, tone: mismatch ? 'hesitant' : tone },
    who_packed: {
      answer: `${draft.packedBy}。`,
      tone: draft.contradiction ? 'defensive' : tone,
    },
    accommodation: { answer: `${accommodation}。`, tone },
    follow_up: { answer: followUp.answer, tone: followUp.tone },
  };

  draft.interview = QUESTIONS.map((spec) => ({
    id: spec.id,
    question: spec.id === 'follow_up' ? followUp.question : spec.question,
    answer: answers[spec.id]?.answer ?? '',
    tone: answers[spec.id]?.tone ?? 'steady',
    unlockedAfter: spec.unlockedAfter,
  }));

  if (rng.bool(0.15)) {
    const target = rng.int(0, draft.interview.length - 1);
    const exchange = draft.interview[target];
    if (exchange !== undefined) exchange.tone = 'hesitant';
  }
};

export const generatePassenger = (seed: Seed, index: PassengerIndex): Passenger => {
  const rng = createPrng(`${seed}#${index}`);
  const isThreat = rng.bool(THREAT_RATE);
  const draft = buildBase(rng);

  const signals = selectSignals(rng, isThreat);
  for (const signal of signals) signal.apply(draft, rng);
  composeInterview(draft, rng);

  const truth: Truth = {
    isThreat,
    threatType: isThreat ? 'hijack' : 'none',
    keySignals: signals.map((s) => s.id),
  };

  return {
    index,
    dossier: freezeDossier(draft),
    truth,
    bodyScan: { finding: draft.bodyScan.finding },
  };
};

export const generateShift = (seed: Seed): readonly Passenger[] =>
  Array.from({ length: PASSENGERS_PER_SHIFT }, (_, i) =>
    generatePassenger(seed, i as PassengerIndex),
  );

export const missedInspections = (
  truth: Truth,
  inspected: readonly InspectedItem[],
): readonly InspectedItem[] => {
  const seen = new Set<InspectedItem>(inspected);
  const missed = new Set<InspectedItem>();
  for (const id of truth.keySignals) {
    const signal = signalOf(id as SignalId);
    if (signal === undefined || signal.revealedBy.length === 0) continue;
    if (signal.revealedBy.some((item) => seen.has(item))) continue;
    for (const item of signal.revealedBy) missed.add(item);
  }
  return [...missed];
};
