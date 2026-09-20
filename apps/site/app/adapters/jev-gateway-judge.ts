import type { JudgeBatch, JudgePort } from '@game/application';
import {
  JEV_ASPECT_QUESTIONS,
  JEV_ENDPOINT,
  JEV_SUSPICION_CRITERIA,
  jevEvaluateResponseSchema,
} from '@game/contracts';
import { toJudgeState } from '@game/domain';
import type { Dossier, JudgeDecision, TimedJudgeDecision } from '@game/domain';

export interface JevGatewayOptions {
  readonly apiKey: string;
  readonly model?: string;
  readonly timeoutMs?: number;
  readonly endpoint?: string;
  readonly zeroDataRetention?: boolean;
  readonly maxRetries?: number;
  readonly retryBaseMs?: number;
  readonly retryBudgetMs?: number;
  readonly maxConcurrency?: number;
  readonly fetchImpl?: typeof fetch;
}

const QUESTIONS = {
  verdict: {
    type: 'choice',
    instructions: 'As an airport security officer, decide what to do with this passenger.',
    criteria: {
      pass: 'No meaningful hijack risk. Let them board.',
      detain: 'Signs suggest a hijack threat. Hold for secondary screening.',
    },
  },
  threat: {
    type: 'boolean',
    instructions: 'Is this passenger planning to hijack the aircraft?',
  },
  suspicion: {
    type: 'score',
    instructions: 'Rate the overall suspicion level.',
    criteria: JEV_SUSPICION_CRITERIA,
  },
  documents: { type: 'boolean', instructions: JEV_ASPECT_QUESTIONS.documents },
  belongings: { type: 'boolean', instructions: JEV_ASPECT_QUESTIONS.belongings },
  interview: { type: 'boolean', instructions: JEV_ASPECT_QUESTIONS.interview },
  body: { type: 'boolean', instructions: JEV_ASPECT_QUESTIONS.body },
  background: { type: 'boolean', instructions: JEV_ASPECT_QUESTIONS.background },
} as const;

const MAX_REASON_LENGTH = 200;

const isRetryable = (status: number): boolean => status === 429 || status >= 500;

const errorReason = async (response: Response): Promise<string> => {
  const status = `http ${response.status}`;
  try {
    const text = (await response.text()).trim();
    if (text.length === 0) return status;
    return `${status}: ${text.slice(0, MAX_REASON_LENGTH)}`;
  } catch {
    return status;
  }
};

const reasonOf = (error: unknown): string => {
  if (error instanceof DOMException && error.name === 'AbortError') return 'timeout';
  if (error instanceof Error) return error.message;
  return 'unknown error';
};

const retryAfterMs = (response: Response): number | null => {
  const header = response.headers?.get('retry-after') ?? null;
  if (header === null) return null;

  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const date = Date.parse(header);
  if (Number.isNaN(date)) return null;

  return Math.max(0, date - Date.now());
};

const sleep = (ms: number): Promise<void> =>
  ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));

const mapWithLimit = async <T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runner = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index] as T);
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => runner()),
  );
  return results;
};

type Attempt =
  | { kind: 'decided'; decision: JudgeDecision }
  | { kind: 'failed'; reason: string; retryable: boolean; retryAfterMs: number | null };

export class JevGatewayJudge implements JudgePort {
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly endpoint: string;
  private readonly zeroDataRetention: boolean;
  private readonly maxRetries: number;
  private readonly retryBaseMs: number;
  private readonly retryBudgetMs: number;
  private readonly maxConcurrency: number;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: JevGatewayOptions) {
    this.model = options.model ?? 'typesafe-ai/jev';
    this.timeoutMs = options.timeoutMs ?? 3000;
    this.endpoint = options.endpoint ?? JEV_ENDPOINT;
    this.zeroDataRetention = options.zeroDataRetention ?? false;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryBaseMs = options.retryBaseMs ?? 400;
    this.retryBudgetMs = options.retryBudgetMs ?? 6000;
    this.maxConcurrency = options.maxConcurrency ?? 6;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async evaluateMany(dossiers: readonly Dossier[]): Promise<JudgeBatch> {
    const startedAt = Date.now();
    const decisions = await mapWithLimit(dossiers, this.maxConcurrency, (dossier) =>
      this.evaluateOne(dossier),
    );
    return { decisions, wallMs: Date.now() - startedAt };
  }

  private async evaluateOne(dossier: Dossier): Promise<TimedJudgeDecision> {
    const startedAt = Date.now();
    let reason = 'not attempted';

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const outcome = await this.attempt(dossier);
      if (outcome.kind === 'decided') {
        return { decision: outcome.decision, latencyMs: Date.now() - startedAt };
      }

      reason = outcome.reason;
      if (!outcome.retryable || attempt === this.maxRetries) break;

      const wait = outcome.retryAfterMs ?? this.retryBaseMs * 2 ** attempt;
      if (Date.now() - startedAt + wait > this.retryBudgetMs) break;
      await sleep(wait);
    }

    return { decision: { kind: 'unavailable', reason }, latencyMs: Date.now() - startedAt };
  }

  private async attempt(dossier: Dossier): Promise<Attempt> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          state: toJudgeState(dossier),
          questions: QUESTIONS,
          ...(this.zeroDataRetention
            ? { providerOptions: { gateway: { zeroDataRetention: true } } }
            : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const retryable = isRetryable(response.status);
        return {
          kind: 'failed',
          reason: await errorReason(response),
          retryable,
          retryAfterMs: retryable ? retryAfterMs(response) : null,
        };
      }

      const parsed = jevEvaluateResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        return {
          kind: 'failed',
          reason: 'unexpected response shape',
          retryable: false,
          retryAfterMs: null,
        };
      }

      const { answers } = parsed.data;
      return {
        kind: 'decided',
        decision: {
          kind: 'decided',
          verdict: answers.verdict.choice,
          verdictConfidence:
            answers.verdict.probabilities?.[answers.verdict.choice] ??
            answers.verdict.confidence ??
            0.5,
          threatProbability: answers.threat.probability,
          suspicion: answers.suspicion.score,
          aspects: {
            documents: answers.documents.probability,
            belongings: answers.belongings.probability,
            interview: answers.interview.probability,
            body: answers.body.probability,
            background: answers.background.probability,
          },
        },
      };
    } catch (error) {
      const reason = reasonOf(error);
      return { kind: 'failed', reason, retryable: reason !== 'timeout', retryAfterMs: null };
    } finally {
      clearTimeout(timer);
    }
  }
}
