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

export class JevGatewayJudge implements JudgePort {
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly endpoint: string;
  private readonly zeroDataRetention: boolean;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: JevGatewayOptions) {
    this.model = options.model ?? 'typesafe-ai/jev';
    this.timeoutMs = options.timeoutMs ?? 3000;
    this.endpoint = options.endpoint ?? JEV_ENDPOINT;
    this.zeroDataRetention = options.zeroDataRetention ?? true;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async evaluateMany(dossiers: readonly Dossier[]): Promise<JudgeBatch> {
    const startedAt = Date.now();
    const decisions = await Promise.all(dossiers.map((dossier) => this.evaluateOne(dossier)));
    return { decisions, wallMs: Date.now() - startedAt };
  }

  private async evaluateOne(dossier: Dossier): Promise<TimedJudgeDecision> {
    const startedAt = Date.now();
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
          providerOptions: { gateway: { zeroDataRetention: this.zeroDataRetention } },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return this.unavailable(startedAt, await errorReason(response));
      }

      const parsed = jevEvaluateResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        return this.unavailable(startedAt, 'unexpected response shape');
      }

      const { answers } = parsed.data;
      const decision: JudgeDecision = {
        kind: 'decided',
        verdict: answers.verdict.choice,
        threatProbability: answers.threat.probability,
        suspicion: answers.suspicion.score,
        aspects: {
          documents: answers.documents.probability,
          belongings: answers.belongings.probability,
          interview: answers.interview.probability,
          body: answers.body.probability,
          background: answers.background.probability,
        },
      };
      return { decision, latencyMs: Date.now() - startedAt };
    } catch (error) {
      return this.unavailable(startedAt, reasonOf(error));
    } finally {
      clearTimeout(timer);
    }
  }

  private unavailable(startedAt: number, reason: string): TimedJudgeDecision {
    return { decision: { kind: 'unavailable', reason }, latencyMs: Date.now() - startedAt };
  }
}
