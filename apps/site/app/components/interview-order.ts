import type { InterviewExchange, QuestionId } from '@game/domain';

export const conversationOrder = (
  exchanges: readonly InterviewExchange[],
  asked: readonly QuestionId[],
): readonly InterviewExchange[] => {
  const byId = new Map(exchanges.map((exchange) => [exchange.id, exchange]));
  return asked.flatMap((id) => {
    const exchange = byId.get(id);
    return exchange === undefined ? [] : [exchange];
  });
};
