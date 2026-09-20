import { TONE_LABELS } from '@game/domain/display';
import type { InterviewExchange, QuestionId } from '@game/domain';
import { useEffect, useRef, useState } from 'hono/jsx';

const TYPING_MS = 700;

export interface InterviewPanelProps {
  readonly exchanges: readonly InterviewExchange[];
  readonly asked: readonly QuestionId[];
  readonly portrait: string;
  readonly followUpUnlocked: boolean;
  readonly onAsk: (id: QuestionId) => void;
}

interface Scrollable {
  scrollTop: number;
  scrollHeight: number;
}

const OfficerAvatar = () => (
  <div class="avatar avatar-placeholder chat-image">
    <div class="w-8 rounded-full bg-primary text-primary-content">
      <span class="text-xs">検</span>
    </div>
  </div>
);

const PassengerAvatar = ({ portrait }: { portrait: string }) => (
  <div class="avatar chat-image">
    <div class="w-8 rounded-full bg-neutral">
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
  const [answered, setAnswered] = useState<QuestionId[]>([]);
  const canvas = useRef<Scrollable | null>(null);

  const typing = asked.length > answered.length;
  const pending = typing ? asked[asked.length - 1] : undefined;

  useEffect(() => {
    if (!typing) return;
    const timer = setTimeout(() => setAnswered([...asked]), TYPING_MS);
    return () => clearTimeout(timer);
  }, [asked.length, typing]);

  useEffect(() => {
    const el = canvas.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [asked.length, answered.length]);

  const shown = exchanges.filter((exchange) => asked.includes(exchange.id));
  const remaining = exchanges.filter((exchange) => !asked.includes(exchange.id));

  return (
    <div class="flex flex-col gap-3">
      <div
        ref={canvas}
        class="h-72 overflow-y-auto rounded-box border border-base-300 bg-neutral/50 p-3"
      >
        {shown.length === 0 ? (
          <p class="grid h-full place-items-center text-sm opacity-50">
            下の選択肢から質問してください
          </p>
        ) : (
          shown.map((exchange) => (
            <div key={exchange.id}>
              <div class="chat chat-end">
                <OfficerAvatar />
                <div class="chat-bubble chat-bubble-primary text-sm">{exchange.question}</div>
              </div>

              {answered.includes(exchange.id) ? (
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
              ) : exchange.id === pending ? (
                <div class="chat chat-start">
                  <PassengerAvatar portrait={portrait} />
                  <div class="chat-bubble">
                    <span class="loading loading-dots loading-sm align-middle" />
                  </div>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {remaining.length === 0 ? (
        <p class="text-center text-sm opacity-50">聞けることはもうありません。</p>
      ) : (
        <div class="flex gap-2 overflow-x-auto pb-1">
          {remaining.map((exchange) => {
            const locked = exchange.id === 'follow_up' && !followUpUnlocked;
            return (
              <button
                type="button"
                key={exchange.id}
                class={`btn btn-sm shrink-0 rounded-full ${
                  exchange.id === 'follow_up' ? 'btn-warning' : 'btn-outline btn-primary'
                }`}
                disabled={locked || typing}
                onClick={() => onAsk(exchange.id)}
              >
                {exchange.id === 'follow_up'
                  ? locked
                    ? '追い質問 ⚡ 3 問で解放'
                    : '追い質問 ⚡'
                  : exchange.question}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
