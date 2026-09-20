import type { Locale } from '@game/domain';
import { useState } from 'hono/jsx';
import { ui } from '../i18n.js';
import { inputValue } from './dom.js';
import JevSorting, { type JevTimings } from './JevSorting.js';

type Phase =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'demo'; shiftId: string; jev: JevTimings }
  | { kind: 'error'; message: string };

export default function StartShift({ locale }: { locale: Locale }) {
  const t = ui(locale);
  const [airport, setAirport] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  const start = async (event: Event) => {
    event.preventDefault();
    setPhase({ kind: 'starting' });

    const response = await fetch('/api/shift', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ airport }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setPhase({
        kind: 'error',
        message:
          body.error === 'airport_too_long' ? t.airportTooLong : t.airportRequired,
      });
      return;
    }

    const body = (await response.json()) as { shiftId: string; jev: JevTimings };
    setPhase({ kind: 'demo', shiftId: body.shiftId, jev: body.jev });
  };

  if (phase.kind === 'demo') {
    return <JevSorting shiftId={phase.shiftId} jev={phase.jev} locale={locale} />;
  }

  return (
    <form onSubmit={start}>
      <h1 class="text-4xl font-bold tracking-wide sm:text-5xl">{t.siteTitle}</h1>
      <p class="mt-4 mb-8 opacity-70">
        {t.startLead}
        <br />
        {t.startRules}
      </p>

      <div class="join w-full">
        <input
          type="text"
          value={airport}
          maxLength={20}
          placeholder={t.airportPlaceholder}
          autoComplete="off"
          class="input input-bordered input-lg join-item grow"
          onInput={(e) => setAirport(inputValue(e))}
        />
        <button
          type="submit"
          class="btn btn-primary btn-lg join-item"
          disabled={phase.kind === 'starting'}
        >
          {phase.kind === 'starting' ? (
            <>
              <span class="loading loading-spinner loading-sm" />
              {t.judging}
            </>
          ) : (
            t.startShift
          )}
        </button>
      </div>

      {phase.kind === 'error' ? (
        <div role="alert" class="alert alert-error mt-4">
          <span>{phase.message}</span>
        </div>
      ) : null}
    </form>
  );
}
