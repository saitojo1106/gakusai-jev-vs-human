import { BODY_SCAN_READOUTS } from '@game/domain/display';
import type { BodyScanFinding, Locale } from '@game/domain';
import { ui } from '../i18n.js';

export interface XrayDialogProps {
  readonly open: boolean;
  readonly portrait: string;
  readonly scanning: boolean;
  readonly finding: BodyScanFinding | null;
  readonly onClose: () => void;
  readonly locale: Locale;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div class="flex justify-between gap-4 border-b border-base-300 py-1 text-sm">
    <span class="opacity-60">{label}</span>
    <span class="tabular-nums">{value}</span>
  </div>
);

export const XrayDialog = ({
  open,
  portrait,
  scanning,
  finding,
  onClose,
  locale,
}: XrayDialogProps) => {
  const t = ui(locale);
  if (!open) return null;

  const readout = finding === null ? null : BODY_SCAN_READOUTS[finding];

  return (
    <dialog class="modal modal-open" aria-label={t.xrayDialogTitle}>
      <div class="modal-box max-w-lg border border-base-300">
        <h3 class="flex items-center gap-2 text-lg font-bold">
          {t.xrayDialogTitle}
          {scanning ? (
            <span class="badge badge-warning badge-sm animate-pulse">SCANNING</span>
          ) : readout?.alarming ? (
            <span class="badge badge-error badge-sm">ALERT</span>
          ) : (
            <span class="badge badge-ghost badge-sm">COMPLETE</span>
          )}
        </h3>

        <div class="xray-frame my-4">
          <div class="xray-silhouette" style={`--portrait: url('${portrait}')`} />
          {scanning ? <div class="xray-beam" /> : null}
          {!scanning && readout?.hotspot != null ? (
            <span
              class="xray-hotspot"
              style={`left:${readout.hotspot.x}%; top:${readout.hotspot.y}%`}
            />
          ) : null}
          <div class="xray-grid" />
        </div>

        {scanning ? (
          <div class="flex flex-col items-center gap-2 py-2">
            <span class="loading loading-bars loading-md text-warning" />
            <p class="text-sm opacity-70">{t.xrayAnalysing}</p>
          </div>
        ) : readout === null ? null : (
          <>
            <div
              role="alert"
              class={`alert ${readout.alarming ? 'alert-error' : 'alert-soft'} mb-3`}
            >
              <span class="font-bold">{readout.headline[locale]}</span>
            </div>
            <p class="mb-3 text-sm">{readout.detail[locale]}</p>
            <Row label={t.xrayRegion} value={readout.region[locale]} />
            <Row label={t.xrayDensity} value={readout.density[locale]} />
            <Row
              label={t.xrayVerdict}
              value={readout.alarming ? t.xrayVerdictAlarm : t.xrayVerdictQuiet}
            />
          </>
        )}

        <div class="modal-action">
          <button type="button" class="btn" onClick={onClose} disabled={scanning}>
            {t.close}
          </button>
        </div>
      </div>
      <button type="button" class="modal-backdrop" onClick={onClose} disabled={scanning}>
        {t.close}
      </button>
    </dialog>
  );
};
