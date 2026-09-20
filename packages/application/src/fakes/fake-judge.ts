import type { AspectId, Dossier, JudgeDecision, TimedJudgeDecision } from '@game/domain';
import type { JudgeBatch, JudgePort } from '../ports.js';

export interface FakeJudgeOptions {
  readonly failAt?: readonly number[];
  readonly latencyMs?: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const aspectScores = (dossier: Dossier): Record<AspectId, number> => {
  const { identity, boardingPass, belongings, purpose, interview, mouth, record } = dossier;

  const documents =
    (identity.inspection.length >= 2 ? 0.6 : identity.inspection.length * 0.12) +
    (identity.photoMatch === 'mismatch' ? 0.25 : identity.photoMatch === 'unsure' ? 0.1 : 0) +
    (identity.anomalies.includes('expired') ? 0.06 : 0) +
    (identity.anomalies.includes('name_variant') ? 0.05 : 0);

  const suspiciousItems = belongings.filter((i) => i.flags.includes('suspicious')).length;
  const misplacedTools = belongings.filter(
    (i) => i.flags.includes('tool') && purpose.stated !== 'relocation',
  ).length;
  const lastMinuteCash =
    boardingPass.tripType === 'one_way' &&
    boardingPass.payment === 'cash' &&
    boardingPass.purchasedDaysBefore <= 1;

  const belongingsScore =
    suspiciousItems * 0.3 + misplacedTools * 0.22 + (lastMinuteCash ? 0.25 : 0);

  const interviewScore =
    interview.filter((e) => e.tone === 'defensive').length * 0.28 +
    interview.filter((e) => e.tone === 'hesitant').length * 0.05;

  const body =
    (mouth.finding === 'wrapped_object' ? 0.6 : mouth.finding === 'refused' ? 0.2 : 0) +
    (dossier.appearance.demeanor === 'sweating' ? 0.12 : 0) +
    (dossier.appearance.demeanor === 'nervous' ? 0.08 : 0) +
    (dossier.appearance.demeanor === 'evasive' ? 0.1 : 0);

  const background =
    (record.watchlistHit ? 0.55 : 0) +
    (record.criminalHistory === 'serious' ? 0.3 : record.criminalHistory === 'minor' ? 0.08 : 0) +
    dossier.residenceHistory.filter((r) => r.stability === 'conflict').length * 0.08;

  return {
    documents: clamp(documents, 0, 1),
    belongings: clamp(belongingsScore, 0, 1),
    interview: clamp(interviewScore, 0, 1),
    body: clamp(body, 0, 1),
    background: clamp(background, 0, 1),
  };
};

export const fakeDecision = (dossier: Dossier): Extract<JudgeDecision, { kind: 'decided' }> => {
  const aspects = aspectScores(dossier);
  const weighted =
    aspects.documents * 0.3 +
    aspects.belongings * 0.28 +
    aspects.interview * 0.16 +
    aspects.body * 0.16 +
    aspects.background * 0.1;
  const threatProbability = clamp(weighted * 1.9, 0.02, 0.98);

  const verdict = threatProbability >= 0.5 ? 'detain' : 'pass';

  return {
    kind: 'decided',
    verdict,
    verdictConfidence: verdict === 'detain' ? threatProbability : 1 - threatProbability,
    threatProbability,
    suspicion: clamp(threatProbability * 4, 0, 4),
    aspects,
  };
};

export class FakeJudge implements JudgePort {
  constructor(private readonly options: FakeJudgeOptions = {}) {}

  evaluateMany(dossiers: readonly Dossier[]): Promise<JudgeBatch> {
    const failAt = new Set(this.options.failAt ?? []);
    const latencyMs = this.options.latencyMs ?? 180;
    const decisions: readonly TimedJudgeDecision[] = dossiers.map((dossier, index) => ({
      decision: failAt.has(index)
        ? ({ kind: 'unavailable', reason: 'fake failure' } as const)
        : fakeDecision(dossier),
      latencyMs: failAt.has(index) ? 3000 : latencyMs + (index % 5) * 12,
    }));
    return Promise.resolve({
      decisions,
      wallMs: Math.max(0, ...decisions.map((d) => d.latencyMs)),
    });
  }
}
