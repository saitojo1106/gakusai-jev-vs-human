export interface PreparingCheckpointProps {
  readonly loaded: number;
  readonly total: number;
}

export const PreparingCheckpoint = ({ loaded, total }: PreparingCheckpointProps) => {
  const percent = total === 0 ? 100 : Math.round((loaded / total) * 100);

  return (
    <div class="flex flex-col items-center gap-3">
      <p class="tracking-widest">検査場を準備中…</p>
      <span class="loader max-w-md" role="progressbar" aria-valuenow={percent}>
        <span style={`width:${percent}%`} />
      </span>
      <p class="text-sm tabular-nums opacity-60">
        {loaded} / {total} 点の資料を読み込み
      </p>
    </div>
  );
};
