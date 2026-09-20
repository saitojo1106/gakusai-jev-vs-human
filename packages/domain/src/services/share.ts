import { PASSENGERS_PER_SHIFT } from '../constants.js';
import { LEVELS } from '../content/levels.js';
import { DEFAULT_LOCALE } from '../i18n.js';
import type { Locale } from '../i18n.js';
import type { ShiftResult } from '../types.js';

export const SHARE_HASHTAGS: Readonly<Record<Locale, string>> = {
  ja: '#保安検査vsJev',
  en: '#CheckpointVsJev',
};

export const SHARE_HASHTAG = SHARE_HASHTAGS[DEFAULT_LOCALE];

export const buildShareText = (
  result: Pick<ShiftResult, 'airport' | 'level' | 'totals'>,
  url: string,
  locale: Locale = DEFAULT_LOCALE,
): string => {
  const card = LEVELS[result.level];
  const { human, jev } = result.totals;

  const lines =
    locale === 'ja'
      ? [
          `【保安検査 vs Jev】${result.airport} の保安検査官レベル: Lv.${card.level} ${card.title.ja}`,
          `「${card.catchphrase.ja}」`,
          `あなた ${human.points} 点 / Jev ${jev.points} 点（正答 ${human.correct}/${PASSENGERS_PER_SHIFT}・見逃し ${human.missedThreats}）`,
        ]
      : [
          `[Checkpoint vs Jev] ${result.airport} officer rating: Lv.${card.level} ${card.title.en}`,
          `"${card.catchphrase.en}"`,
          `You ${human.points} / Jev ${jev.points} (correct ${human.correct}/${PASSENGERS_PER_SHIFT}, missed ${human.missedThreats})`,
        ];

  return [...lines, SHARE_HASHTAGS[locale], url].join('\n');
};
