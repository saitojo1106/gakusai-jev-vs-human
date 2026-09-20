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

const LANES = [
  { id: 'pass', label: '通過' },
  { id: 'detain', label: '拘束' },
] as const;

export default function JevSorting({ shiftId, jev }: { shiftId: string; jev: JevTimings }) {
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

  return (
    <section>
      <h1 class="text-3xl font-bold sm:text-4xl">Jev が仕分け中…</h1>

      <progress
        class="progress progress-primary my-5 w-full"
        value={landed.length}
        max={PASSENGERS_PER_SHIFT}
      />

      <div class="grid grid-cols-2 gap-4">
        {LANES.map((lane, laneIndex) => (
          <div class="card border border-base-300 bg-neutral" key={lane.id}>
            <div class="card-body relative min-h-40 items-center p-4">
              <h2 class="text-xs tracking-[0.2em] opacity-60">{lane.label}</h2>
              <div class="flex flex-wrap justify-center gap-1.5">
                {landed
                  .filter((index) => index % 2 === laneIndex)
                  .map((index) => (
                    <span
                      key={index}
                      aria-label="封印された判定"
                      class="sealed-card animate-land h-9 w-6 rounded-xs border border-base-300"
                    />
                  ))}
              </div>
              {sealed ? (
                <div class="absolute inset-0 grid place-items-center rounded-box bg-neutral/85 backdrop-blur-sm">
                  <span class="badge badge-primary badge-lg tracking-[0.2em]">封印済</span>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <p class="mt-5 min-h-12 text-lg">
        {done ? (
          <>
            Jev: {PASSENGERS_PER_SHIFT} 人を{' '}
            <span class="font-bold text-primary">{seconds(jev.totalMs)} 秒</span>
            で仕分け完了。判定は封印されました。
            {jev.failed > 0 ? ` （${jev.failed} 人は回線エラー）` : ''}
          </>
        ) : (
          <>
            {landed.length} / {PASSENGERS_PER_SHIFT} 人
          </>
        )}
      </p>

      <p class="mb-4 text-sm opacity-60">
        実時間 {seconds(jev.totalMs)} 秒。速すぎて見えないので、再生だけ引き伸ばしています。
      </p>

      {done ? (
        <a href={`/play/${shiftId}/0`} class="btn btn-primary btn-lg">
          あなたの番です。配置につく →
        </a>
      ) : (
        <button type="button" class="btn btn-ghost" onClick={skip}>
          スキップ
        </button>
      )}
    </section>
  );
}
