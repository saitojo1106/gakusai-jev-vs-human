import { TONE_LABELS } from '@game/domain/display';
import type { InterviewExchange, QuestionId } from '@game/domain';

export interface InterviewPanelProps {
  readonly exchanges: readonly InterviewExchange[];
  readonly asked: readonly QuestionId[];
  readonly portrait: string;
  readonly followUpUnlocked: boolean;
  readonly onAsk: (id: QuestionId) => void;
}

const OfficerAvatar = () => (
  <div class="avatar avatar-placeholder chat-image">
    <div class="w-9 rounded-full bg-primary text-primary-content">
      <span class="text-sm">検</span>
    </div>
  </div>
);

const PassengerAvatar = ({ portrait }: { portrait: string }) => (
  <div class="avatar chat-image">
    <div class="w-9 rounded-full bg-neutral">
      <img src={portrait} alt="" class="object-cover object-top" />
    </div>
  </div>
);

export const InterviewPanel = ({
  exchanges,
  asked,
  portrait,
  followUpUnlocked,
  onAsk,
}: InterviewPanelProps) => {
  const answered = exchanges.filter((exchange) => asked.includes(exchange.id));
  const remaining = exchanges.filter((exchange) => !asked.includes(exchange.id));

  return (
    <>
      {answered.length === 0 ? (
        <p class="text-sm opacity-60">まだ何も聞いていません。</p>
      ) : (
        <div class="max-h-96 overflow-y-auto pr-1">
          {answered.map((exchange) => (
            <div key={exchange.id}>
              <div class="chat chat-end">
                <OfficerAvatar />
                <div class="chat-bubble chat-bubble-primary text-sm">{exchange.question}</div>
              </div>
              <div class="chat chat-start">
                <PassengerAvatar portrait={portrait} />
                <div class="chat-bubble">{exchange.answer}</div>
                <div
                  class={`chat-footer text-xs ${
                    exchange.tone === 'steady' ? 'opacity-50' : 'text-warning'
                  }`}
                >
                  {TONE_LABELS[exchange.tone]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {remaining.length === 0 ? null : (
        <>
          <h3 class="text-xs tracking-widest opacity-60">まだ聞いていない質問</h3>
          <div class="flex flex-col gap-2">
            {remaining.map((exchange) => {
              const locked = exchange.id === 'follow_up' && !followUpUnlocked;
              return (
                <button
                  type="button"
                  key={exchange.id}
                  class={`btn btn-sm justify-start ${
                    exchange.id === 'follow_up' ? 'btn-outline btn-warning' : 'btn-ghost'
                  }`}
                  disabled={locked}
                  onClick={() => onAsk(exchange.id)}
                >
                  {exchange.id === 'follow_up'
                    ? locked
                      ? '追い質問 ⚡（3 問聞くと解放）'
                      : '追い質問 ⚡'
                    : exchange.question}
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
};
