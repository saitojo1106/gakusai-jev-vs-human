import type {
  AirportName,
  ArchetypeId,
  Confidence,
  CountryCode,
  Dossier,
  InspectedItem,
  LeaderboardEntry,
  PassengerIndex,
  Reveal,
  ResultId,
  Seed,
  ShiftId,
  ShiftRecord,
  ShiftResult,
  SignalId,
} from '@game/domain';
import { z } from 'zod';

export const INSPECTED_ITEMS = [
  'identity',
  'boarding_pass',
  'belongings',
  'passport_inspection',
  'mouth',
  'record',
  'residence',
  'question:purpose',
  'question:occupation',
  'question:bag_contents',
  'question:who_packed',
  'question:accommodation',
  'question:follow_up',
] as const satisfies readonly InspectedItem[];

const isoDateTime = z.string().min(1);
const probability = z.number().min(0).max(1);

export const verdictSchema = z.enum(['pass', 'detain']);
export const inspectedItemSchema = z.enum(INSPECTED_ITEMS);
export const levelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const seedSchema = z.string().min(1).transform((v) => v as Seed);
export const shiftIdSchema = z.string().min(1).transform((v) => v as ShiftId);
export const resultIdSchema = z.string().min(1).transform((v) => v as ResultId);
export const airportNameSchema = z.string().min(1).max(20).transform((v) => v as AirportName);
export const passengerIndexSchema = z
  .number()
  .int()
  .min(0)
  .max(9)
  .transform((v) => v as PassengerIndex);
export const confidenceSchema = z.number().min(0.5).max(1).transform((v) => v as Confidence);

export const appearanceSchema = z.object({
  ageBand: z.enum(['20s', '30s', '40s', '50s', '60s+']),
  archetype: z.string().min(1).transform((v) => v as ArchetypeId),
  demeanor: z.enum(['calm', 'nervous', 'sweating', 'irritable', 'evasive']),
  notableItems: z.array(z.string()),
});

export const identityDocumentSchema = z.object({
  kind: z.enum(['passport', 'national_id', 'drivers_license']),
  fullName: z.string().min(1),
  nationality: z.string().min(1).transform((v) => v as CountryCode),
  birthDate: z.string().min(1),
  expiresOn: z.string().min(1),
  photoMatch: z.enum(['match', 'unsure', 'mismatch']),
  anomalies: z.array(z.enum(['expired', 'name_variant'])),
  inspection: z.array(
    z.enum([
      'hologram_dim',
      'font_irregular',
      'mrz_checksum_fail',
      'photo_edge_lifted',
      'issue_date_in_future',
    ]),
  ),
});

export const boardingPassSchema = z.object({
  flightNo: z.string().min(1),
  destination: z.string().min(1),
  seat: z.string().min(1),
  tripType: z.enum(['one_way', 'round_trip']),
  payment: z.enum(['card', 'cash', 'points']),
  purchasedDaysBefore: z.number().int().min(0),
  checkedBags: z.number().int().min(0),
});

export const itemSchema = z.object({
  kind: z.string().min(1),
  quantity: z.number().int().min(1),
  flags: z.array(z.enum(['liquid', 'tool', 'electronics', 'suspicious'])),
});

export const travelPurposeSchema = z.object({
  stated: z.enum(['tourism', 'business', 'family', 'study', 'relocation', 'other']),
  stayDays: z.number().int().min(1),
  companions: z.number().int().min(0),
});

export const questionIdSchema = z.enum([
  'purpose',
  'occupation',
  'bag_contents',
  'who_packed',
  'accommodation',
  'follow_up',
]);

export const interviewExchangeSchema = z.object({
  id: questionIdSchema,
  question: z.string().min(1),
  answer: z.string().min(1),
  tone: z.enum(['steady', 'hesitant', 'defensive']),
  unlockedAfter: z.number().int().min(0),
});

export const mouthInspectionSchema = z.object({
  finding: z.enum(['clear', 'candy', 'dental_work', 'wrapped_object', 'refused']),
});

export const backgroundRecordSchema = z.object({
  criminalHistory: z.enum(['none', 'minor', 'serious']),
  watchlistHit: z.boolean(),
  tripsLastYear: z.number().int().min(0),
});

export const residenceEntrySchema = z.object({
  country: z.string().min(1).transform((v) => v as CountryCode),
  years: z.number().int().min(1),
  stability: z.enum(['stable', 'unstable', 'conflict']),
});

export const dossierSchema = z.object({
  appearance: appearanceSchema,
  identity: identityDocumentSchema,
  boardingPass: boardingPassSchema,
  belongings: z.array(itemSchema),
  purpose: travelPurposeSchema,
  interview: z.array(interviewExchangeSchema),
  mouth: mouthInspectionSchema,
  record: backgroundRecordSchema,
  residenceHistory: z.array(residenceEntrySchema),
});

export const truthSchema = z.object({
  isThreat: z.boolean(),
  threatType: z.enum(['hijack', 'none']),
  keySignals: z.array(z.string().transform((v) => v as SignalId)),
});

export const aspectsSchema = z.object({
  documents: probability,
  belongings: probability,
  interview: probability,
  body: probability,
  background: probability,
});

export const judgeDecisionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('decided'),
    verdict: verdictSchema,
    threatProbability: probability,
    suspicion: z.number().min(0).max(4),
    aspects: aspectsSchema,
  }),
  z.object({ kind: z.literal('unavailable'), reason: z.string() }),
]);

export const timedJudgeDecisionSchema = z.object({
  decision: judgeDecisionSchema,
  latencyMs: z.number().min(0),
});

const scoredShape = {
  outcome: z.enum([
    'correct_pass',
    'correct_detain',
    'false_detain',
    'missed_threat',
    'unavailable',
  ]),
  points: z.number(),
  hijackOccurred: z.boolean(),
};

export const humanDecisionSchema = z.object({
  verdict: verdictSchema,
  confidence: confidenceSchema,
  elapsedMs: z.number().int().min(0),
  inspected: z.array(inspectedItemSchema),
});

export const revealSchema = z.object({
  index: passengerIndexSchema,
  truth: truthSchema,
  human: z.object({ ...humanDecisionSchema.shape, ...scoredShape }),
  jev: z.object({ ...timedJudgeDecisionSchema.shape, ...scoredShape }),
  missedByHuman: z.array(inspectedItemSchema),
});

export const totalsSchema = z.object({
  points: z.number(),
  correct: z.number().int().min(0),
  missedThreats: z.number().int().min(0),
  falseDetains: z.number().int().min(0),
  elapsedMs: z.number().min(0),
});

export const shiftRecordSchema = z.object({
  shiftId: shiftIdSchema,
  seed: seedSchema,
  airport: airportNameSchema,
  startedAt: isoDateTime,
  jev: z.array(timedJudgeDecisionSchema),
  jevWallMs: z.number().min(0),
  human: z.array(humanDecisionSchema.nullable()),
  resultId: resultIdSchema.nullable(),
});

export const shiftResultSchema = z.object({
  resultId: resultIdSchema,
  shiftId: shiftIdSchema,
  seed: seedSchema,
  airport: airportNameSchema,
  finishedAt: isoDateTime,
  reveals: z.array(revealSchema),
  totals: z.object({ human: totalsSchema, jev: totalsSchema }),
  winner: z.enum(['human', 'jev', 'draw']),
  level: levelSchema,
});

export const leaderboardEntrySchema = z.object({
  resultId: resultIdSchema,
  airport: airportNameSchema,
  level: levelSchema,
  points: z.number(),
  marginOverJev: z.number(),
  finishedAt: isoDateTime,
});

export const leaderboardSchema = z.array(leaderboardEntrySchema);

type Assert<Actual extends Expected, Expected> = Actual;

export type ParsedDossier = Assert<z.infer<typeof dossierSchema>, Dossier>;
export type ParsedReveal = Assert<z.infer<typeof revealSchema>, Reveal>;
export type ParsedShiftRecord = Assert<z.infer<typeof shiftRecordSchema>, ShiftRecord>;
export type ParsedShiftResult = Assert<z.infer<typeof shiftResultSchema>, ShiftResult>;
export type ParsedLeaderboardEntry = Assert<
  z.infer<typeof leaderboardEntrySchema>,
  LeaderboardEntry
>;
