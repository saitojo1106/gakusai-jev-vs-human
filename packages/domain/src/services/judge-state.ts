import { REFERENCE_DATE } from '../constants.js';
import { countryOf } from '../content/countries.js';
import { itemOf } from '../content/items.js';
import type { Dossier } from '../types.js';

const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export const toJudgeState = (dossier: Dossier): Record<string, unknown> => ({
  today: REFERENCE_DATE,
  appearance: {
    ageBand: dossier.appearance.ageBand,
    look: dossier.appearance.archetype,
    demeanor: dossier.appearance.demeanor,
    notableItems: [...dossier.appearance.notableItems],
  },
  identityDocument: {
    kind: dossier.identity.kind,
    fullName: dossier.identity.fullName,
    nationality: countryOf(dossier.identity.nationality)?.code ?? dossier.identity.nationality,
    nationalityStability: countryOf(dossier.identity.nationality)?.stability ?? 'unknown',
    birthDate: dossier.identity.birthDate,
    expiresOn: dossier.identity.expiresOn,
    daysUntilExpiry: daysBetween(REFERENCE_DATE, dossier.identity.expiresOn),
    photoMatch: dossier.identity.photoMatch,
    flaggedAnomalies: [...dossier.identity.anomalies],
    forgeryObservations: [...dossier.identity.inspection],
  },
  boardingPass: {
    flightNumber: dossier.boardingPass.flightNo,
    destination: dossier.boardingPass.destination,
    seat: dossier.boardingPass.seat,
    tripType: dossier.boardingPass.tripType,
    payment: dossier.boardingPass.payment,
    purchasedDaysBeforeDeparture: dossier.boardingPass.purchasedDaysBefore,
    checkedBags: dossier.boardingPass.checkedBags,
  },
  belongings: dossier.belongings.map((item) => ({
    item: item.kind,
    description: itemOf(item.kind)?.label ?? item.kind,
    quantity: item.quantity,
    flags: [...item.flags],
  })),
  travelPurpose: {
    stated: dossier.purpose.stated,
    stayDays: dossier.purpose.stayDays,
    companions: dossier.purpose.companions,
  },
  interview: dossier.interview.map((exchange) => ({
    topic: exchange.id,
    question: exchange.question,
    answer: exchange.answer,
    tone: exchange.tone,
  })),
  mouthInspection: dossier.mouth.finding,
  backgroundCheck: {
    criminalHistory: dossier.record.criminalHistory,
    watchlistHit: dossier.record.watchlistHit,
    tripsLastYear: dossier.record.tripsLastYear,
  },
  residenceHistory: dossier.residenceHistory.map((entry) => ({
    country: entry.country,
    years: entry.years,
    stability: entry.stability,
  })),
});
