import type {
  Appearance,
  BodyScanFinding,
  ArchetypeId,
  BackgroundRecord,
  BoardingPass,
  CountryCode,
  Demeanor,
  Dossier,
  ForgeryObservation,
  IdentityDocument,
  InterviewExchange,
  ItemFlag,
  MouthInspection,
  QuestionId,
  ResidenceEntry,
  TravelPurpose,
} from './types.js';

export interface DossierDraft {
  appearance: {
    ageBand: Appearance['ageBand'];
    archetype: ArchetypeId;
    demeanor: Demeanor;
    notableItems: string[];
  };
  identity: {
    kind: IdentityDocument['kind'];
    fullName: string;
    nationality: CountryCode;
    birthDate: string;
    expiresOn: string;
    photoMatch: IdentityDocument['photoMatch'];
    anomalies: ('expired' | 'name_variant')[];
    inspection: ForgeryObservation[];
  };
  boardingPass: {
    flightNo: string;
    destination: string;
    seat: string;
    tripType: BoardingPass['tripType'];
    payment: BoardingPass['payment'];
    purchasedDaysBefore: number;
    checkedBags: number;
  };
  belongings: { kind: string; quantity: number; flags: ItemFlag[] }[];
  purpose: {
    stated: TravelPurpose['stated'];
    stayDays: number;
    companions: number;
  };
  interview: {
    id: QuestionId;
    question: string;
    answer: string;
    tone: InterviewExchange['tone'];
    unlockedAfter: number;
  }[];
  mouth: { finding: MouthInspection['finding'] };
  bodyScan: { finding: BodyScanFinding };
  record: {
    criminalHistory: BackgroundRecord['criminalHistory'];
    watchlistHit: boolean;
    tripsLastYear: number;
  };
  residenceHistory: {
    country: CountryCode;
    years: number;
    stability: ResidenceEntry['stability'];
  }[];
  occupation: string;
  accommodation: string;
  packedBy: string;
  contradiction: boolean;
}

export const freezeDossier = (draft: DossierDraft): Dossier => ({
  appearance: {
    ageBand: draft.appearance.ageBand,
    archetype: draft.appearance.archetype,
    demeanor: draft.appearance.demeanor,
    notableItems: [...draft.appearance.notableItems],
  },
  identity: {
    kind: draft.identity.kind,
    fullName: draft.identity.fullName,
    nationality: draft.identity.nationality,
    birthDate: draft.identity.birthDate,
    expiresOn: draft.identity.expiresOn,
    photoMatch: draft.identity.photoMatch,
    anomalies: [...draft.identity.anomalies],
    inspection: [...draft.identity.inspection],
  },
  boardingPass: { ...draft.boardingPass },
  belongings: draft.belongings.map((i) => ({
    kind: i.kind,
    quantity: i.quantity,
    flags: [...i.flags],
  })),
  purpose: { ...draft.purpose },
  interview: draft.interview.map((e) => ({ ...e })),
  mouth: { ...draft.mouth },
  record: { ...draft.record },
  residenceHistory: draft.residenceHistory.map((r) => ({ ...r })),
});
