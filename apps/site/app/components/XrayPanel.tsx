import { BODY_SCAN_READOUTS } from '@game/domain/display';
import type { BodyScanFinding, Locale } from '@game/domain';
import { ui } from '../i18n.js';

export interface XrayPanelProps {
  readonly finding: BodyScanFinding | null;
  readonly usedOn: number | null;
  readonly scanning: boolean;
  readonly onScan: () => void;
  readonly onReopen: () => void;
  readonly locale: Locale;
}

const auraFor = (scanning: boolean, available: boolean): string => {
  if (!available) return '';
  return scanning ? 'aura aura-holo aura-lg duration-[1.5s]' : 'aura aura-lg text-warning';
};

export const XrayPanel = ({
  finding,
  usedOn,
  scanning,
  onScan,
  onReopen,
  locale,
}: XrayPanelProps) => {
  const t = ui(locale);
  if (finding === null) {
    const available = usedOn === null;
    const label = scanning
      ? t.xrayScanning
      : available
        ? t.xrayUse
        : t.xrayUsedOn((usedOn ?? 0) + 1);

    return (
      <>
        <div role="alert" class="alert alert-warning alert-soft py-2">
          <span>{t.xrayOnce}</span>
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

  const readout = BODY_SCAN_READOUTS[finding];

  return (
    <>
      {readout.alarming ? (
        <div class="aura aura-glow aura-xl block text-error duration-[2s]">
          <div role="alert" class="alert alert-error">
            <span class="font-bold">{readout.headline[locale]}</span>
          </div>
        </div>
      ) : (
        <div role="alert" class="alert alert-soft">
          <span>{readout.headline[locale]}</span>
        </div>
      )}
      <p class="text-sm">{readout.detail[locale]}</p>
      <button type="button" class="btn btn-outline btn-sm self-start" onClick={onReopen}>
        {t.xrayViewScan}
      </button>
      <p class="text-sm opacity-60">{t.xraySpent}</p>
    </>
  );
};
