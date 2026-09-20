import { BODY_SCAN_LABELS } from '@game/domain/display';
import type { BodyScanFinding } from '@game/domain';

export interface XrayPanelProps {
  readonly finding: BodyScanFinding | null;
  readonly usedOn: number | null;
  readonly scanning: boolean;
  readonly onScan: () => void;
}

const auraFor = (scanning: boolean, available: boolean): string => {
  if (!available) return '';
  return scanning ? 'aura aura-holo aura-lg duration-[1.5s]' : 'aura aura-lg text-warning';
};

export const XrayPanel = ({ finding, usedOn, scanning, onScan }: XrayPanelProps) => {
  if (finding === null) {
    const available = usedOn === null;
    const label = scanning
      ? 'スキャン中…'
      : available
        ? 'この乗客に X 線検査を使う'
        : `使用済み（${(usedOn ?? 0) + 1} 人目）`;

    return (
      <>
        <div role="alert" class="alert alert-warning alert-soft py-2">
          <span>X 線検査は 1 シフトに 1 回だけ。使いどころを選んでください。</span>
        </div>
        <div class={`self-start ${auraFor(scanning, available)}`}>
          <button
            type="button"
            class="btn btn-warning"
            onClick={onScan}
            disabled={scanning || !available}
          >
            {scanning ? <span class="loading loading-bars loading-sm" /> : null}
            <span>{label}</span>
          </button>
        </div>
      </>
    );
  }

  const quiet = finding === 'clear' || finding === 'unreadable';

  return (
    <>
      {quiet ? (
        <div role="alert" class="alert alert-soft">
          <span>所見: {BODY_SCAN_LABELS[finding]}</span>
        </div>
      ) : (
        <div class="aura aura-glow aura-xl block text-error duration-[2s]">
          <div role="alert" class="alert alert-error">
            <span class="font-bold">所見: {BODY_SCAN_LABELS[finding]}</span>
          </div>
        </div>
      )}
      <p class="text-sm opacity-60">このシフトの X 線検査はもう使えません。</p>
    </>
  );
};
