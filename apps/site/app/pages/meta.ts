import { buildShareText, LEVELS } from '@game/domain';
import type { Locale, ShiftResult } from '@game/domain';
import { LOCALE_QUERY, ui } from '../i18n.js';

export interface ResultMeta {
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly image: string;
  readonly shareText: string;
  readonly shareUrl: string;
}

export const buildResultMeta = (
  result: ShiftResult,
  origin: string,
  locale: Locale,
): ResultMeta => {
  const card = LEVELS[result.level];
  const t = ui(locale);
  // 共有先でも同じ言語で開くように、URL に言語を残す。
  const url = `${origin}/r/${result.resultId}?${LOCALE_QUERY}=${locale}`;
  const shareText = buildShareText(result, url, locale);

  return {
    title: t.resultTitle(result.airport, card.level, card.title[locale]),
    description: t.resultDescription({
      human: result.totals.human.points,
      jev: result.totals.jev.points,
      correct: result.totals.human.correct,
      total: result.reveals.length,
      missed: result.totals.human.missedThreats,
      catchphrase: card.catchphrase[locale],
    }),
    url,
    image: `${origin}${card.image}`,
    shareText,
    shareUrl: `https://x.com/intent/post?text=${encodeURIComponent(shareText.replace(`\n${url}`, ''))}&url=${encodeURIComponent(url)}`,
  };
};
