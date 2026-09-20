import { PASSENGERS_PER_SHIFT } from '@game/domain';
import { useState } from 'hono/jsx';
import { inputValue } from './dom.js';

interface JevTimings {
  readonly perPassengerMs: readonly number[];
  readonly totalMs: number;
  readonly failed: number;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'demo'; shiftId: string; jev: JevTimings }
  | { kind: 'error'; message: string };

const seconds = (ms: number): string => (ms / 1000).toFixed(2);

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
    return (
      <section>
        <h1>Jev が審査中…</h1>
        <div class="demo-grid">
          {phase.jev.perPassengerMs.map((ms, i) => (
            <div class="done" key={i}>
              [{i + 1}] {seconds(ms)}s
            </div>
          ))}
        </div>
        <p>
          Jev: {PASSENGERS_PER_SHIFT} 人を <strong>{seconds(phase.jev.totalMs)} 秒</strong>
          で審査完了。判定は封印されました。
          {phase.jev.failed > 0 ? ` （${phase.jev.failed} 人は回線エラー）` : ''}
        </p>
        <p>
          <a href={`/play/${phase.shiftId}/0`}>
            <button type="button">あなたの番です。配置につく →</button>
          </a>
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={start}>
      <div class="field">
        <input
          type="text"
          value={airport}
          maxLength={20}
          placeholder="あなたの空港名"
          autoComplete="off"
          onInput={(e) => setAirport(inputValue(e))}
        />
        <button type="submit" disabled={phase.kind === 'starting'}>
          {phase.kind === 'starting' ? 'Jev が審査中…' : 'シフト開始'}
        </button>
      </div>
      {phase.kind === 'error' ? <p class="error">{phase.message}</p> : null}
    </form>
  );
}
