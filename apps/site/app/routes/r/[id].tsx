import { createUsecases } from '@game/application';
import {
  ASPECT_LABELS,
  INSPECTED_LABELS,
  LEVELS,
  OUTCOME_LABELS,
  formatDuration,
} from '@game/domain/display';
import type { Reveal, ShiftResult } from '@game/domain';
import { createRoute } from 'honox/factory';
import { ui } from '../../i18n.js';
import { createDeps } from '../../deps.js';
import { buildResultMeta } from '../../pages/meta.js';

const isCorrect = (reveal: Reveal, side: 'human' | 'jev'): boolean =>
  reveal[side].outcome === 'correct_pass' || reveal[side].outcome === 'correct_detain';

const Marks = ({ result, side }: { result: ShiftResult; side: 'human' | 'jev' }) => (
  <span class="text-lg tracking-[0.25em]">
    {result.reveals.map((reveal) => (
      <span class={isCorrect(reveal, side) ? 'text-success' : 'text-error'} key={reveal.index}>
        {isCorrect(reveal, side) ? '✓' : '✗'}
      </span>
    ))}
  </span>
);

export default createRoute(async (c) => {
  const usecases = createUsecases(createDeps(c.env as AppBindings, c.req.url));
  const result = await usecases.getResult({ resultId: c.req.param('id') ?? '' }).catch(() => null);
  const fromRanking = c.req.query('from') === 'ranking';
  const locale = c.get('locale');
  const t = ui(locale);

  if (result === null) {
    return c.render(
      <main class="mx-auto max-w-xl px-4 py-8">
        <h1 class="mb-4 text-2xl font-bold">{t.resultNotFound}</h1>
        <div role="alert" class="alert">
          <span>
            {t.resultNotFoundBody}
            <a class="link link-primary" href="/">
              {t.backToTitle}
            </a>
          </span>
        </div>
      </main>,
      { title: t.resultNotFound, locale, url: c.req.url },
    );
  }

  const meta = buildResultMeta(result, new URL(c.req.url).origin, locale);
  const card = LEVELS[result.level];
  const { human, jev } = result.totals;

  return c.render(
    <main class="mx-auto max-w-2xl px-4 py-8">
      <div class="hover-3d w-full">
        <div class="card border border-base-300 bg-base-200">
          <figure class="relative @container">
            <img src={card.image} alt={`Lv.${card.level} ${card.title[locale]}`} class="w-full" />
            <div class="absolute inset-y-0 right-0 flex w-2/5 flex-col items-center justify-center gap-[1cqi] px-[2cqi] text-center">
              <p class="w-full truncate text-[4cqi] opacity-70">{result.airport}</p>
              <p
                class={`text-[12cqi] font-bold leading-none tabular-nums ${
                  human.points >= 0 ? 'text-success' : 'text-error'
                }`}
              >
                {human.points}
              </p>
              <p class="text-[3.4cqi] opacity-70">vs Jev {jev.points}</p>
            </div>
          </figure>
          <div class="card-body items-center text-center">
            <h1 class="card-title text-3xl">
              Lv.{card.level} {card.title[locale]}
            </h1>
            <p class="text-primary">{t.quote(card.catchphrase[locale])}</p>
          </div>
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} aria-hidden="true" />
        ))}
      </div>

      <div class="stats stats-vertical mt-6 w-full border border-base-300 bg-base-200 sm:stats-horizontal">
        <div class="stat place-items-center">
          <div class="stat-title">{t.you}</div>
          <div class="stat-value tabular-nums">{human.points}</div>
        </div>
        <div class="stat place-items-center">
          <div class="stat-title">Jev</div>
          <div class="stat-value tabular-nums">{jev.points}</div>
        </div>
        <div class="stat place-items-center">
          <div class="stat-title">{t.winner}</div>
          <div
            class={`stat-value text-2xl ${
              result.winner === 'human' ? 'text-success' : result.winner === 'jev' ? 'text-error' : ''
            }`}
          >
            {result.winner === 'human' ? t.youWin : result.winner === 'jev' ? t.jevWins : t.draw}
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        {fromRanking ? null : (
          <a href={meta.shareUrl} target="_blank" rel="noreferrer" class="btn btn-primary">
            {t.shareOnX}
          </a>
        )}
        <a href="/ranking" class="btn btn-outline">
          {t.seeRanking}
        </a>
        <a href={`/api/result/${result.resultId}`} download class="btn btn-ghost">
          {t.saveJson}
        </a>
      </div>

      <div class="card mt-6 border border-base-300 bg-base-200">
        <div class="card-body gap-2">
          <div class="flex justify-between border-b border-base-300 py-1">
            <span class="opacity-60">{t.statCorrect}</span>
            <span class="tabular-nums">
              {t.ofTotal(human.correct, result.reveals.length, jev.correct)}
            </span>
          </div>
          <div class="flex justify-between border-b border-base-300 py-1">
            <span class="opacity-60">{t.statMissed}</span>
            <span class="tabular-nums">
              {human.missedThreats} {t.withJev(jev.missedThreats)}
            </span>
          </div>
          <div class="flex justify-between border-b border-base-300 py-1">
            <span class="opacity-60">{t.statFalseDetain}</span>
            <span class="tabular-nums">
              {human.falseDetains} {t.withJev(jev.falseDetains)}
            </span>
          </div>
          <div class="flex justify-between py-1">
            <span class="opacity-60">{t.statDuration}</span>
            <span class="tabular-nums">
              {formatDuration(human.elapsedMs, locale)} vs {formatDuration(jev.elapsedMs, locale)}
            </span>
          </div>

          <div class="mt-2 flex flex-col gap-1">
            <div class="flex items-center gap-3">
              <Marks result={result} side="human" />
              <span class="text-sm opacity-60">{t.you}</span>
            </div>
            <div class="flex items-center gap-3">
              <Marks result={result} side="jev" />
              <span class="text-sm opacity-60">Jev</span>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-2">
        {result.reveals.map((reveal) => (
          <div class="collapse-arrow collapse border border-base-300 bg-base-200" key={reveal.index}>
            <input type="checkbox" />
            <div class="collapse-title text-sm font-medium">
              {t.passengerLabel(reveal.index + 1)}
              {t.midDot}
              {t.truthPrefix}: {reveal.truth.isThreat ? t.truthThreatShort : t.truthBenignShort}
              {t.midDot}
              {OUTCOME_LABELS[reveal.human.outcome][locale]}
              <span
                class={`ml-2 tabular-nums ${reveal.human.points >= 0 ? 'text-success' : 'text-error'}`}
              >
                {reveal.human.points >= 0 ? '+' : ''}
                {reveal.human.points}
              </span>
            </div>
            <div class="collapse-content flex flex-col gap-2 text-sm">
              <p>
                {t.you}: {reveal.human.verdict === 'detain' ? t.detain : t.pass}
                {t.midDot}
                {t.confidenceSuffix} {Math.round(reveal.human.confidence * 100)}%{t.midDot}
                {formatDuration(reveal.human.elapsedMs, locale)}
              </p>
              <p>
                Jev:{' '}
                {reveal.jev.decision.kind === 'decided'
                  ? [
                      reveal.jev.decision.verdict === 'detain' ? t.detain : t.pass,
                      `${t.confidenceSuffix} ${Math.round(reveal.jev.decision.verdictConfidence * 100)}%`,
                      `${t.jevThreatEstimate} ${reveal.jev.decision.threatProbability.toFixed(2)}`,
                      `(${reveal.jev.points >= 0 ? '+' : ''}${reveal.jev.points})`,
                    ].join(t.midDot)
                  : t.noDecision}
              </p>

              {reveal.jev.decision.kind === 'decided' ? (
                <div class="flex flex-col gap-1">
                  {Object.entries(reveal.jev.decision.aspects).map(([id, value]) => (
                    <div class="grid grid-cols-[4rem_1fr_2.5rem] items-center gap-2" key={id}>
                      <span class="opacity-70">
                        {ASPECT_LABELS[id as keyof typeof ASPECT_LABELS][locale]}
                      </span>
                      <progress class="progress progress-primary" value={value} max={1} />
                      <span class="text-right tabular-nums">{value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <p class="opacity-60">
                {t.inspectedByYou}:{' '}
                {reveal.human.inspected.length === 0
                  ? t.none
                  : reveal.human.inspected
                      .map((item) => INSPECTED_LABELS[item][locale])
                      .join(t.listSeparator)}
              </p>
              {reveal.missedByHuman.length > 0 ? (
                <p class="text-warning">
                  {t.notInspected}:{' '}
                  {reveal.missedByHuman
                    .map((item) => INSPECTED_LABELS[item][locale])
                    .join(t.listSeparator)}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div class="mt-8">
        <a class="link link-primary" href="/">
          {t.playAgain}
        </a>
      </div>
    </main>,
    {
      title: meta.title,
      description: meta.description,
      image: meta.image,
      canonical: meta.url,
      locale,
      url: c.req.url,
    },
  );
});
