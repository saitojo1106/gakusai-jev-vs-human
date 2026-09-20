import { OUTCOME_LABELS, formatDuration } from '@game/domain/display';
import { useState } from 'hono/jsx';

interface Row {
  readonly index: number;
  readonly isThreat: boolean;
  readonly verdict: 'pass' | 'detain' | null;
  readonly verdictConfidence: number | null;
  readonly outcome:
    | 'correct_pass'
    | 'correct_detain'
    | 'false_detain'
    | 'missed_threat'
    | 'unavailable';
  readonly points: number;
  readonly latencyMs: number;
}

const TOTAL = 10;
const BATCH = 10;
const HUMAN_SECONDS_PER_PASSENGER = 60;

const DOT_COLORS: Readonly<Record<Row['outcome'], string>> = {
  correct_pass: 'bg-success/45',
  correct_detain: 'bg-success',
  false_detain: 'bg-warning',
  missed_threat: 'bg-error',
  unavailable: 'bg-base-300',
};

const isCorrect = (row: Row): boolean =>
  row.outcome === 'correct_pass' || row.outcome === 'correct_detain';

export default function JevDemo() {
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRows([]);
    setElapsedMs(0);
    setError(null);
    setRunning(true);

    const seed = `demo-${Date.now()}`;
    const startedAt = Date.now();
    const collected: Row[] = [];

    for (let from = 0; from < TOTAL; from += BATCH) {
      const response = await fetch('/api/demo/batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seed, from, count: BATCH }),
      });

      if (!response.ok) {
        setError('Jev の呼び出しに失敗しました。');
        break;
      }

      const body = (await response.json()) as { rows: Row[] };
      collected.push(...body.rows);
      setRows([...collected]);
      setElapsedMs(Date.now() - startedAt);
    }

    setElapsedMs(Date.now() - startedAt);
    setRunning(false);
  };

  const done = rows.length;
  const correct = rows.filter(isCorrect).length;
  const threats = rows.filter((r) => r.isThreat).length;
  const missed = rows.filter((r) => r.outcome === 'missed_threat').length;
  const falseDetains = rows.filter((r) => r.outcome === 'false_detain').length;
  const failed = rows.filter((r) => r.outcome === 'unavailable').length;
  const points = rows.reduce((sum, r) => sum + r.points, 0);
  const accuracy = done === 0 ? 0 : Math.round((correct / done) * 100);
  const humanSeconds = done * HUMAN_SECONDS_PER_PASSENGER;

  return (
    <section>
      <button type="button" class="btn btn-primary btn-lg" onClick={run} disabled={running}>
        {running ? (
          <>
            <span class="loading loading-spinner loading-sm" />
            審査中… {done} / {TOTAL} 人
          </>
        ) : (
          <>Jev に {TOTAL} 人を審査させる</>
        )}
      </button>

      {running ? (
        <progress class="progress progress-primary mt-4 w-full" value={done} max={TOTAL} />
      ) : null}

      {error === null ? null : (
        <div role="alert" class="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}

      {done === 0 ? (
        <p class="mt-6 opacity-70">
          1 シフト分の乗客 {TOTAL} 人を Jev が何秒で裁くかを見る。乗客はシードから毎回新しく
          生成される。Jev の呼び出しには 30 秒あたり 10 件のレート制限があるので、続けて回す
          場合は少し間を空けてください。
        </p>
      ) : (
        <>
          <div class="stats stats-vertical mt-6 w-full border border-base-300 bg-base-200 sm:stats-horizontal">
            <div class="stat place-items-center">
              <div class="stat-title">審査した人数</div>
              <div class="stat-value tabular-nums">{done}</div>
            </div>
            <div class="stat place-items-center">
              <div class="stat-title">経過時間</div>
              <div class="stat-value tabular-nums text-primary">
                {(elapsedMs / 1000).toFixed(1)}s
              </div>
            </div>
            <div class="stat place-items-center">
              <div class="stat-title">正答率</div>
              <div class="stat-value tabular-nums">{accuracy}%</div>
            </div>
            <div class="stat place-items-center">
              <div class="stat-title">スコア</div>
              <div class={`stat-value tabular-nums ${points >= 0 ? 'text-success' : 'text-error'}`}>
                {points}
              </div>
            </div>
          </div>

          <p class="mt-4">
            脅威 {threats} 人のうち <span class="font-bold text-error">{missed} 人を見逃し</span>
            、無害な乗客を <span class="font-bold text-warning">{falseDetains} 人</span> 拘束。
            {failed > 0 ? ` ${failed} 人は回線エラー。` : ''}
          </p>

          {running ? null : (
            <div class="alert alert-info mt-4 items-start">
              <div>
                同じ {done} 人を人間が 1 人 1 分で審査すると{' '}
                <span class="font-bold">{formatDuration(humanSeconds * 1000)}</span>。Jev は{' '}
                <span class="font-bold">{(elapsedMs / 1000).toFixed(1)} 秒</span>。
                <div class="text-sm opacity-70">
                  約 {Math.round(humanSeconds / Math.max(elapsedMs / 1000, 0.1))} 倍の速さ
                </div>
              </div>
            </div>
          )}

          <div class="mt-6 flex flex-wrap gap-1">
            {rows.map((row) => (
              <span
                key={row.index}
                class={`h-3.5 w-3.5 rounded-xs ${DOT_COLORS[row.outcome]}`}
                title={`乗客 ${row.index + 1}・${row.isThreat ? '脅威' : '無害'}・${OUTCOME_LABELS[row.outcome]}・${row.latencyMs}ms`}
              />
            ))}
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm opacity-70">
            {(
              [
                'correct_pass',
                'correct_detain',
                'false_detain',
                'missed_threat',
                'unavailable',
              ] as const
            ).map((outcome) => (
              <span class="flex items-center gap-1" key={outcome}>
                <span class={`h-3 w-3 rounded-xs ${DOT_COLORS[outcome]}`} />
                {OUTCOME_LABELS[outcome]}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
