import { PASSENGERS_PER_SHIFT } from '@game/domain/display';
import { useEffect, useState } from 'hono/jsx';

export interface JevTimings {
  readonly perPassengerMs: readonly number[];
  readonly totalMs: number;
  readonly failed: number;
}

const REPLAY_SPEED = 4;
const MIN_REPLAY_MS = 1500;
const MAX_REPLAY_MS = 6000;

const seconds = (ms: number): string => (ms / 1000).toFixed(2);

const replayDelays = (perPassengerMs: readonly number[]): number[] => {
  const slowest = Math.max(1, ...perPassengerMs);
  const stretch = Math.min(
    Math.max(REPLAY_SPEED, MIN_REPLAY_MS / slowest),
    MAX_REPLAY_MS / slowest,
  );
  return perPassengerMs.map((ms) => ms * stretch);
};

export default function JevSorting({
  shiftId,
  jev,
}: {
  shiftId: string;
  jev: JevTimings;
}) {
  const [landed, setLanded] = useState<number[]>([]);
  const [sealed, setSealed] = useState(false);

  const delays = replayDelays(jev.perPassengerMs);
  const done = landed.length >= jev.perPassengerMs.length;

  useEffect(() => {
    const timers = delays.map((delay, index) =>
      setTimeout(() => setLanded((current) => [...current, index]), delay),
    );
    const finish = setTimeout(() => setSealed(true), Math.max(...delays) + 400);
    return () => {
      for (const timer of timers) clearTimeout(timer);
      clearTimeout(finish);
    };
  }, []);

  const skip = () => {
    setLanded(jev.perPassengerMs.map((_, i) => i));
    setSealed(true);
  };

  const lanes = [
    { id: 'pass', label: '通過' },
    { id: 'detain', label: '拘束' },
  ] as const;

  return (
    <section class="sorting">
      <h1>Jev が仕分け中…</h1>

      <div class="sorting-lanes">
        {lanes.map((lane, laneIndex) => (
          <div class={`lane ${sealed ? 'sealed' : ''}`} key={lane.id}>
            <h2>{lane.label}</h2>
            <div class="lane-slots">
              {landed
                .filter((index) => index % 2 === laneIndex)
                .map((index) => (
                  <span class="sealed-card" key={index} aria-label="封印された判定" />
                ))}
            </div>
            {sealed ? <p class="lane-seal">封印済</p> : null}
          </div>
        ))}
      </div>

      <p class="sorting-status">
        {done ? (
          <>
            Jev: {PASSENGERS_PER_SHIFT} 人を <strong>{seconds(jev.totalMs)} 秒</strong>
            で仕分け完了。判定は封印されました。
            {jev.failed > 0 ? ` （${jev.failed} 人は回線エラー）` : ''}
          </>
        ) : (
          <>
            {landed.length} / {PASSENGERS_PER_SHIFT} 人
          </>
        )}
      </p>
      <p class="muted sorting-note">
        実時間 {seconds(jev.totalMs)} 秒。速すぎて見えないので、再生だけ引き伸ばしています。
      </p>

      <p>
        {done ? (
          <a href={`/play/${shiftId}/0`}>
            <button type="button">あなたの番です。配置につく →</button>
          </a>
        ) : (
          <button type="button" onClick={skip}>
            スキップ
          </button>
        )}
      </p>
    </section>
  );
}
