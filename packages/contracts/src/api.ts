import { z } from 'zod';
import {
  airportNameSchema,
  verdictSchema,
  dossierSchema,
  humanDecisionSchema,
  leaderboardSchema,
  resultIdSchema,
  revealSchema,
  shiftIdSchema,
  shiftResultSchema,
} from './schemas.js';

export const startShiftRequestSchema = z.object({
  airport: z.string().min(1).max(100),
});

export const startShiftResponseSchema = z.object({
  shiftId: shiftIdSchema,
  jev: z.object({
    perPassengerMs: z.array(z.number().min(0)),
    totalMs: z.number().min(0),
    failed: z.number().int().min(0),
  }),
});

export const servePassengerResponseSchema = z.object({
  dossier: dossierSchema,
  decided: z.boolean(),
});

export const submitVerdictRequestSchema = humanDecisionSchema;

export const submitVerdictResponseSchema = revealSchema;

export const finishShiftResponseSchema = z.object({
  resultId: resultIdSchema,
  url: z.string().min(1),
});

export const getResultResponseSchema = shiftResultSchema;

export const rankingQuerySchema = z.object({
  airport: airportNameSchema.optional(),
});

export const rankingResponseSchema = leaderboardSchema;

export const DEMO_MAX_PASSENGERS = 200;
export const DEMO_MAX_BATCH = 20;

export const demoBatchRequestSchema = z.object({
  seed: z.string().min(1).max(64),
  from: z.number().int().min(0).max(DEMO_MAX_PASSENGERS - 1),
  count: z.number().int().min(1).max(DEMO_MAX_BATCH),
});

export const demoRowSchema = z.object({
  index: z.number().int().min(0),
  isThreat: z.boolean(),
  verdict: verdictSchema.nullable(),
  verdictConfidence: z.number().nullable(),
  outcome: z.enum([
    'correct_pass',
    'correct_detain',
    'false_detain',
    'missed_threat',
    'unavailable',
  ]),
  points: z.number(),
  latencyMs: z.number().min(0),
  reason: z.string().nullable(),
});

export const demoBatchResponseSchema = z.object({
  rows: z.array(demoRowSchema),
  wallMs: z.number().min(0),
});

export const apiErrorSchema = z.object({
  error: z.enum([
    'invalid_airport',
    'airport_too_long',
    'shift_not_found',
    'passenger_not_found',
    'already_decided',
    'shift_incomplete',
    'result_not_found',
    'rate_limited',
  ]),
  message: z.string(),
});

export type StartShiftRequest = z.infer<typeof startShiftRequestSchema>;
export type StartShiftResponse = z.infer<typeof startShiftResponseSchema>;
export type ServePassengerResponse = z.infer<typeof servePassengerResponseSchema>;
export type SubmitVerdictRequest = z.infer<typeof submitVerdictRequestSchema>;
export type SubmitVerdictResponse = z.infer<typeof submitVerdictResponseSchema>;
export type FinishShiftResponse = z.infer<typeof finishShiftResponseSchema>;
export type GetResultResponse = z.infer<typeof getResultResponseSchema>;
export type RankingQuery = z.infer<typeof rankingQuerySchema>;
export type RankingResponse = z.infer<typeof rankingResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type DemoBatchRequest = z.infer<typeof demoBatchRequestSchema>;
export type DemoRow = z.infer<typeof demoRowSchema>;
export type DemoBatchResponse = z.infer<typeof demoBatchResponseSchema>;
