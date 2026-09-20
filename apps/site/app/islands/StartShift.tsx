import { useState } from 'hono/jsx';
import { inputValue } from './dom.js';
import JevSorting, { type JevTimings } from './JevSorting.js';

type Phase =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'demo'; shiftId: string; jev: JevTimings }
  | { kind: 'error'; message: string };

export default function StartShift() {
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
          body.error === 'airport_too_long'
            ? '空港名は 20 文字までです。'
            : '空港名を入力してください。',
      });
      return;
    }

    const body = (await response.json()) as { shiftId: string; jev: JevTimings };
    setPhase({ kind: 'demo', shiftId: body.shiftId, jev: body.jev });
  };

  if (phase.kind === 'demo') {
    return <JevSorting shiftId={phase.shiftId} jev={phase.jev} />;
  }

  return (
    <form onSubmit={start}>
      <h1 class="text-4xl font-bold tracking-wide sm:text-5xl">保安検査 vs Jev</h1>
      <p class="mt-4 mb-8 opacity-70">
        乗客 10 人を審査して、AI 判定モデル Jev とスコアを競う。
        <br />
        脅威を通過させればハイジャック、無害な人を拘束すれば苦情。
      </p>

      <div class="join w-full">
        <input
          type="text"
          value={airport}
          maxLength={20}
          placeholder="あなたの空港名"
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
              Jev が審査中…
            </>
          ) : (
            'シフト開始'
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
