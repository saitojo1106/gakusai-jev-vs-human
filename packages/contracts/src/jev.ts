import { z } from 'zod';

const probability = z.number().min(0).max(1);
const probabilityAnswer = z.object({ probability });

export const JEV_ENDPOINT = 'https://ai-gateway.vercel.sh/v1/evaluate';

export const JEV_ASPECT_QUESTIONS = {
  documents: 'Are the identity documents forged, expired, or inconsistent?',
  belongings: 'Do the belongings conflict with the stated purpose or pose a risk?',
  interview: 'Are the answers in the interview inconsistent or evasive?',
  body: 'Do demeanor or the physical inspection suggest concealment?',
  background: 'Do the criminal record or residence history raise the risk?',
} as const;

export const JEV_SUSPICION_CRITERIA = ['none', 'low', 'medium', 'high', 'critical'] as const;

export const jevQuestionsSchema = z.object({
  verdict: z.object({
    type: z.literal('choice'),
    instructions: z.string(),
    criteria: z.object({ pass: z.string(), detain: z.string() }),
  }),
  threat: z.object({ type: z.literal('boolean'), instructions: z.string() }),
  suspicion: z.object({
    type: z.literal('score'),
    instructions: z.string(),
    criteria: z.array(z.string()),
  }),
  documents: z.object({ type: z.literal('boolean'), instructions: z.string() }),
  belongings: z.object({ type: z.literal('boolean'), instructions: z.string() }),
  interview: z.object({ type: z.literal('boolean'), instructions: z.string() }),
  body: z.object({ type: z.literal('boolean'), instructions: z.string() }),
  background: z.object({ type: z.literal('boolean'), instructions: z.string() }),
});

export const jevEvaluateRequestSchema = z.object({
  model: z.string().min(1),
  state: z.unknown(),
  questions: jevQuestionsSchema,
  providerOptions: z
    .object({
      gateway: z.object({ zeroDataRetention: z.boolean() }).optional(),
    })
    .optional(),
});

export const jevEvaluateResponseSchema = z.object({
  answers: z.object({
    verdict: z.object({
      choice: z.enum(['pass', 'detain']),
      probabilities: z.object({ pass: probability, detain: probability }).optional(),
      confidence: probability.optional(),
    }),
    threat: probabilityAnswer,
    suspicion: z.object({
      score: z.number().min(0).max(JEV_SUSPICION_CRITERIA.length - 1),
      confidence: probability.optional(),
    }),
    documents: probabilityAnswer,
    belongings: probabilityAnswer,
    interview: probabilityAnswer,
    body: probabilityAnswer,
    background: probabilityAnswer,
  }),
  usage: z
    .object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
      totalTokens: z.number().optional(),
    })
    .optional(),
  rounding: z.number().optional(),
  warnings: z.array(z.unknown()).optional(),
});

export type JevEvaluateRequest = z.infer<typeof jevEvaluateRequestSchema>;
export type JevEvaluateResponse = z.infer<typeof jevEvaluateResponseSchema>;
