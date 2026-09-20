import type { Locale } from '@game/domain';
import { ui } from '../i18n.js';

export interface PreparingCheckpointProps {
  readonly loaded: number;
  readonly total: number;
  readonly locale: Locale;
}

export const PreparingCheckpoint = ({ loaded, total, locale }: PreparingCheckpointProps) => {
  const percent = total === 0 ? 100 : Math.round((loaded / total) * 100);

  return (
    <div class="flex flex-col items-center gap-3">
      <p class="tracking-widest">{ui(locale).preparingCheckpoint}</p>
      <span class="loader max-w-md" role="progressbar" aria-valuenow={percent}>
        <span style={`width:${percent}%`} />
      </span>
      <p class="text-sm tabular-nums opacity-60">
        {locale === 'ja'
          ? `${loaded} / ${total} 点の資料を読み込み`
          : `Loaded ${loaded} of ${total} files`}
      </p>
    </div>
  );
};
