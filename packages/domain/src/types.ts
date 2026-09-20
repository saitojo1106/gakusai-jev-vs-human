export type Seed = string & { readonly __brand: 'Seed' };
export type ShiftId = string & { readonly __brand: 'ShiftId' };
export type ResultId = string & { readonly __brand: 'ResultId' };
export type AirportName = string & { readonly __brand: 'AirportName' };
export type PassengerIndex = number & { readonly __brand: 'PassengerIndex' };
export type SignalId = string & { readonly __brand: 'SignalId' };
export type Confidence = number & { readonly __brand: 'Confidence' };
export type CountryCode = string & { readonly __brand: 'CountryCode' };
export type ArchetypeId = string & { readonly __brand: 'ArchetypeId' };

export type Verdict = 'pass' | 'detain';

export type Demeanor = 'calm' | 'nervous' | 'sweating' | 'irritable' | 'evasive';

export interface Appearance {
  readonly ageBand: '20s' | '30s' | '40s' | '50s' | '60s+';
  readonly archetype: ArchetypeId;
  readonly demeanor: Demeanor;
  readonly notableItems: readonly string[];
}

export type ForgeryObservation =
  | 'hologram_dim'
  | 'font_irregular'
  | 'mrz_checksum_fail'
  | 'photo_edge_lifted'
  | 'issue_date_in_future';

export interface IdentityDocument {
  readonly kind: 'passport' | 'national_id' | 'drivers_license';
  readonly fullName: string;
  readonly nationality: CountryCode;
  readonly birthDate: string;
  readonly expiresOn: string;
  readonly photoMatch: 'match' | 'unsure' | 'mismatch';
  readonly anomalies: readonly ('expired' | 'name_variant')[];
  readonly inspection: readonly ForgeryObservation[];
}

export interface BoardingPass {
  readonly flightNo: string;
  readonly destination: string;
  readonly seat: string;
  readonly tripType: 'one_way' | 'round_trip';
  readonly payment: 'card' | 'cash' | 'points';
  readonly purchasedDaysBefore: number;
  readonly checkedBags: number;
}

export type ItemFlag = 'liquid' | 'tool' | 'electronics' | 'suspicious';

export interface Item {
  readonly kind: string;
  readonly quantity: number;
  readonly flags: readonly ItemFlag[];
}

export interface TravelPurpose {
  readonly stated: 'tourism' | 'business' | 'family' | 'study' | 'relocation' | 'other';
  readonly stayDays: number;
  readonly companions: number;
}

export type QuestionId =
  | 'purpose'
  | 'occupation'
  | 'bag_contents'
  | 'who_packed'
  | 'accommodation'
  | 'follow_up';

export interface InterviewExchange {
  readonly id: QuestionId;
  readonly question: string;
  readonly answer: string;
  readonly tone: 'steady' | 'hesitant' | 'defensive';
  readonly unlockedAfter: number;
}

export interface MouthInspection {
  readonly finding: 'clear' | 'candy' | 'dental_work' | 'wrapped_object' | 'refused';
}

export interface BackgroundRecord {
  readonly criminalHistory: 'none' | 'minor' | 'serious';
  readonly watchlistHit: boolean;
  readonly tripsLastYear: number;
}

export interface ResidenceEntry {
  readonly country: CountryCode;
  readonly years: number;
  readonly stability: 'stable' | 'unstable' | 'conflict';
}

export interface Dossier {
  readonly appearance: Appearance;
  readonly identity: IdentityDocument;
  readonly boardingPass: BoardingPass;
  readonly belongings: readonly Item[];
  readonly purpose: TravelPurpose;
  readonly interview: readonly InterviewExchange[];
  readonly mouth: MouthInspection;
  readonly record: BackgroundRecord;
  readonly residenceHistory: readonly ResidenceEntry[];
}

export interface Truth {
  readonly isThreat: boolean;
  readonly threatType: 'hijack' | 'none';
  readonly keySignals: readonly SignalId[];
}

export interface Passenger {
  readonly index: PassengerIndex;
  readonly dossier: Dossier;
  readonly truth: Truth;
}

export type InspectedItem =
  | 'identity'
  | 'boarding_pass'
  | 'belongings'
  | 'passport_inspection'
  | 'mouth'
  | 'record'
  | 'residence'
  | `question:${QuestionId}`;

export interface HumanDecision {
  readonly verdict: Verdict;
  readonly confidence: Confidence;
  readonly elapsedMs: number;
  readonly inspected: readonly InspectedItem[];
}

export type AspectId = 'documents' | 'belongings' | 'interview' | 'body' | 'background';

export type JudgeDecision =
  | {
      readonly kind: 'decided';
      readonly verdict: Verdict;
      readonly verdictConfidence: number;
      readonly threatProbability: number;
      readonly suspicion: number;
      readonly aspects: Readonly<Record<AspectId, number>>;
    }
  | { readonly kind: 'unavailable'; readonly reason: string };

export interface TimedJudgeDecision {
  readonly decision: JudgeDecision;
  readonly latencyMs: number;
}

export type Outcome =
  | 'correct_pass'
  | 'correct_detain'
  | 'false_detain'
  | 'missed_threat'
  | 'unavailable';

export interface Scored {
  readonly outcome: Outcome;
  readonly points: number;
  readonly hijackOccurred: boolean;
}

export interface Reveal {
  readonly index: PassengerIndex;
  readonly truth: Truth;
  readonly human: HumanDecision & Scored;
  readonly jev: TimedJudgeDecision & Scored;
  readonly missedByHuman: readonly InspectedItem[];
}

export interface ShiftRecord {
  readonly shiftId: ShiftId;
  readonly seed: Seed;
  readonly airport: AirportName;
  readonly startedAt: string;
  readonly jev: readonly TimedJudgeDecision[];
  readonly jevWallMs: number;
  readonly human: readonly (HumanDecision | null)[];
  readonly resultId: ResultId | null;
}

export type Level = 1 | 2 | 3 | 4 | 5;

export interface Totals {
  readonly points: number;
  readonly correct: number;
  readonly missedThreats: number;
  readonly falseDetains: number;
  readonly elapsedMs: number;
}

export interface ShiftResult {
  readonly resultId: ResultId;
  readonly shiftId: ShiftId;
  readonly seed: Seed;
  readonly airport: AirportName;
  readonly finishedAt: string;
  readonly reveals: readonly Reveal[];
  readonly totals: { readonly human: Totals; readonly jev: Totals };
  readonly winner: 'human' | 'jev' | 'draw';
  readonly level: Level;
}

export interface LeaderboardEntry {
  readonly resultId: ResultId;
  readonly airport: AirportName;
  readonly level: Level;
  readonly points: number;
  readonly marginOverJev: number;
  readonly finishedAt: string;
}
