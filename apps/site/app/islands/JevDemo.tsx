import { OUTCOME_LABELS, formatDuration } from '@game/domain/display';
import { useState } from 'hono/jsx';

interface Row {
  readonly index: number;
  readonly isThreat: boolean;
  readonly verdict: 'pass' | 'detain' | null;
  readonly verdictConfidence: number | null;
  readonly outcome: 'correct_pass' | 'correct_detain' | 'false_detain' | 'missed_threat' | 'unavailable';
  readonly points: number;
  readonly latencyMs: number;
}

const TOTAL = 100;
const BATCH = 10;
const HUMAN_SECONDS_PER_PASSENGER = 60;

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
      <p>
        <button type="button" onClick={run} disabled={running}>
          <span>
            {running ? `審査中… ${done} / ${TOTAL} 人` : `Jev に ${TOTAL} 人を審査させる`}
          </span>
        </button>
      </p>

      {error === null ? null : <p class="error">{error}</p>}

      {done === 0 ? (
        <p class="muted">
          空港の 1 日分に相当する {TOTAL} 人を、Jev が何秒で裁くかを見る。乗客はシードから毎回
          新しく生成される。
        </p>
      ) : (
        <>
          <div class="demo-counters">
            <div>
              <span class="demo-value">{done}</span>
              <span class="demo-label">審査した人数</span>
            </div>
            <div>
              <span class="demo-value">{(elapsedMs / 1000).toFixed(1)}s</span>
              <span class="demo-label">経過時間</span>
            </div>
            <div>
              <span class="demo-value">{accuracy}%</span>
              <span class="demo-label">正答率</span>
            </div>
            <div>
              <span class={`demo-value ${points >= 0 ? 'mark-ok' : 'mark-ng'}`}>{points}</span>
              <span class="demo-label">スコア</span>
            </div>
          </div>

          <p>
            脅威 {threats} 人のうち <strong class="mark-ng">{missed} 人を見逃し</strong>、無害な乗客を{' '}
            <strong class="mark-ng">{falseDetains} 人</strong> 拘束。
            {failed > 0 ? ` ${failed} 人は回線エラー。` : ''}
          </p>

          {running ? null : (
            <p class="demo-punch">
              同じ {done} 人を人間が 1 人 1 分で審査すると{' '}
              <strong>{formatDuration(humanSeconds * 1000)}</strong>。Jev は{' '}
              <strong>{(elapsedMs / 1000).toFixed(1)} 秒</strong>。
              <br />
              <span class="muted">
                約 {Math.round(humanSeconds / Math.max(elapsedMs / 1000, 0.1))} 倍の速さ
              </span>
            </p>
          )}

          <div class="demo-dots">
            {rows.map((row) => (
              <span
                key={row.index}
                class={`demo-dot ${row.outcome}`}
                title={`乗客 ${row.index + 1}・${row.isThreat ? '脅威' : '無害'}・${OUTCOME_LABELS[row.outcome]}・${row.latencyMs}ms`}
              />
            ))}
          </div>

          <p class="muted demo-legend">
            <span class="demo-dot correct_pass" /> 正しく通過{' '}
            <span class="demo-dot correct_detain" /> 正しく拘束{' '}
            <span class="demo-dot false_detain" /> 誤検知{' '}
            <span class="demo-dot missed_threat" /> 見逃し{' '}
            <span class="demo-dot unavailable" /> エラー
          </p>
        </>
      )}
    </section>
  );
}
