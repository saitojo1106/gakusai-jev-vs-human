import { PASSENGERS_PER_SHIFT } from '../constants.js';
import { LEVELS } from '../content/levels.js';
import type { ShiftResult } from '../types.js';

export const SHARE_HASHTAG = '#保安検査vsJev';

export const buildShareText = (
  result: Pick<ShiftResult, 'airport' | 'level' | 'totals'>,
  url: string,
): string => {
  const card = LEVELS[result.level];
  const { human, jev } = result.totals;
  return [
    `【保安検査 vs Jev】${result.airport} の保安検査官レベル: Lv.${card.level} ${card.title}`,
    `「${card.catchphrase}」`,
    `あなた ${human.points} 点 / Jev ${jev.points} 点（正答 ${human.correct}/${PASSENGERS_PER_SHIFT}・見逃し ${human.missedThreats}）`,
    SHARE_HASHTAG,
    url,
  ].join('\n');
};
