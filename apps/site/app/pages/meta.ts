import { buildShareText, LEVELS } from '@game/domain';
import type { ShiftResult } from '@game/domain';

export interface ResultMeta {
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly image: string;
  readonly shareText: string;
  readonly shareUrl: string;
}

export const buildResultMeta = (result: ShiftResult, origin: string): ResultMeta => {
  const card = LEVELS[result.level];
  const url = `${origin}/r/${result.resultId}`;
  const shareText = buildShareText(result, url);

  return {
    title: `${result.airport} の保安検査官レベル: Lv.${card.level} ${card.title}`,
    description: `あなた ${result.totals.human.points} 点 / Jev ${result.totals.jev.points} 点（正答 ${result.totals.human.correct}/${result.reveals.length}・見逃し ${result.totals.human.missedThreats}）「${card.catchphrase}」`,
    url,
    image: `${origin}${card.image}`,
    shareText,
    shareUrl: `https://x.com/intent/post?text=${encodeURIComponent(shareText.replace(`\n${url}`, ''))}&url=${encodeURIComponent(url)}`,
  };
};
