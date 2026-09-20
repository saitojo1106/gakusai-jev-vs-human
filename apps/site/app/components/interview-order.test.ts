import type { InterviewExchange, QuestionId } from '@game/domain';
import { describe, expect, it } from 'vitest';
import { conversationOrder } from './interview-order.js';

const exchange = (id: QuestionId): InterviewExchange => ({
  id,
  question: `${id}?`,
  answer: `${id}.`,
  tone: 'steady',
  unlockedAfter: 0,
});

const EXCHANGES: readonly InterviewExchange[] = [
  exchange('purpose'),
  exchange('occupation'),
  exchange('bag_contents'),
  exchange('who_packed'),
  exchange('accommodation'),
  exchange('follow_up'),
];

const ids = (list: readonly InterviewExchange[]): QuestionId[] => list.map((e) => e.id);

describe('conversationOrder', () => {
  it('選択肢の並び順ではなく、押した順に並べる', () => {
    const asked: QuestionId[] = ['accommodation', 'purpose', 'bag_contents'];
    expect(ids(conversationOrder(EXCHANGES, asked))).toEqual(asked);
  });

  it('新しく押したものは必ず末尾に足される', () => {
    const before = conversationOrder(EXCHANGES, ['accommodation', 'purpose']);
    const after = conversationOrder(EXCHANGES, ['accommodation', 'purpose', 'occupation']);

    expect(ids(after).slice(0, before.length)).toEqual(ids(before));
    expect(ids(after).at(-1)).toBe('occupation');
  });

  it('まだ押していない質問は含めない', () => {
    expect(ids(conversationOrder(EXCHANGES, ['purpose']))).toEqual(['purpose']);
  });

  it('何も押していなければ空', () => {
    expect(conversationOrder(EXCHANGES, [])).toEqual([]);
  });

  it('対応する質問が無い id は読み飛ばす', () => {
    const asked = ['purpose', 'missing' as QuestionId, 'follow_up'] satisfies QuestionId[];
    expect(ids(conversationOrder(EXCHANGES, asked))).toEqual(['purpose', 'follow_up']);
  });
});
