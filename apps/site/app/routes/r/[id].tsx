import { createUsecases } from '@game/application';
import {
  ASPECT_LABELS,
  INSPECTED_LABELS,
  LEVELS,
  OUTCOME_LABELS,
  formatDuration,
} from '@game/domain/display';
import type { Reveal, ShiftResult } from '@game/domain';
import { createRoute } from 'honox/factory';
import { createDeps } from '../../deps.js';
import { buildResultMeta } from '../../pages/meta.js';

const isCorrect = (reveal: Reveal, side: 'human' | 'jev'): boolean =>
  reveal[side].outcome === 'correct_pass' || reveal[side].outcome === 'correct_detain';

const Marks = ({ result, side }: { result: ShiftResult; side: 'human' | 'jev' }) => (
  <span class="marks">
    {result.reveals.map((reveal) => (
      <span class={isCorrect(reveal, side) ? 'mark-ok' : 'mark-ng'} key={reveal.index}>
        {isCorrect(reveal, side) ? '✓' : '✗'}
      </span>
    ))}
  </span>
);

export default createRoute(async (c) => {
  const usecases = createUsecases(createDeps(c.env as AppBindings, c.req.url));
  const result = await usecases
    .getResult({ resultId: c.req.param('id') ?? '' })
    .catch(() => null);

  if (result === null) {
    return c.render(
      <main class="shell narrow">
        <h1>結果が見つかりません</h1>
        <p>
          URL が違うか、まだ保存されていません。<a href="/">タイトルに戻る</a>
        </p>
      </main>,
      { title: '結果が見つかりません' },
    );
  }

  const meta = buildResultMeta(result, new URL(c.req.url).origin);
  const card = LEVELS[result.level];
  const { human, jev } = result.totals;

  return c.render(
    <main class="shell narrow">
      <img class="level-card" src={card.image} alt={`Lv.${card.level} ${card.title}`} />
      <h1>
        Lv.{card.level} {card.title}
      </h1>
      <p class="lede">
        {result.airport}
        <br />「{card.catchphrase}」
      </p>

      <div class="hud">
        <span>
          あなた <strong>{human.points}</strong>
        </span>
        <span>
          Jev <strong>{jev.points}</strong>
        </span>
        <span class="spacer">
          {result.winner === 'human' ? 'あなたの勝ち' : result.winner === 'jev' ? 'Jev の勝ち' : '引き分け'}
        </span>
      </div>

      <p>
        <a href={meta.shareUrl} target="_blank" rel="noreferrer">
          <button type="button">X でシェア</button>
        </a>{' '}
        <a href="/ranking">
          <button type="button">ランキングを見る</button>
        </a>{' '}
        <a href={`/api/result/${result.resultId}`} download>
          <button type="button">JSON を保存</button>
        </a>
      </p>

      <section class="panel">
        <dl class="rows">
          <dt>正答</dt>
          <dd>
            {human.correct}/{result.reveals.length}（Jev {jev.correct}/{result.reveals.length}）
          </dd>
          <dt>見逃し</dt>
          <dd>
            {human.missedThreats}（Jev {jev.missedThreats}）
          </dd>
          <dt>誤検知</dt>
          <dd>
            {human.falseDetains}（Jev {jev.falseDetains}）
          </dd>
          <dt>所要時間</dt>
          <dd>
            {formatDuration(human.elapsedMs)} vs {formatDuration(jev.elapsedMs)}
          </dd>
        </dl>
        <p>
          <Marks result={result} side="human" /> ← あなた
          <br />
          <Marks result={result} side="jev" /> ← Jev
        </p>
      </section>

      {result.reveals.map((reveal) => (
        <details key={reveal.index}>
          <summary>
            乗客 {reveal.index + 1}・真実: {reveal.truth.isThreat ? '脅威' : '無害'}・あなた{' '}
            {OUTCOME_LABELS[reveal.human.outcome]}（{reveal.human.points >= 0 ? '+' : ''}
            {reveal.human.points}）
          </summary>
          <p>
            あなた: {reveal.human.verdict === 'detain' ? '拘束' : '通過'}・確信度{' '}
            {Math.round(reveal.human.confidence * 100)}%・{formatDuration(reveal.human.elapsedMs)}
            <br />
            Jev:{' '}
            {reveal.jev.decision.kind === 'decided'
              ? `${reveal.jev.decision.verdict === 'detain' ? '拘束' : '通過'}・確信度 ${reveal.jev.decision.threatProbability.toFixed(2)}（${reveal.jev.points >= 0 ? '+' : ''}${reveal.jev.points}）`
              : '判定不能'}
          </p>
          {reveal.jev.decision.kind === 'decided' ? (
            <div>
              {Object.entries(reveal.jev.decision.aspects).map(([id, value]) => (
                <div class="bar" key={id}>
                  <span>{ASPECT_LABELS[id as keyof typeof ASPECT_LABELS]}</span>
                  <span class="track">
                    <span class="fill" style={`width:${Math.round(value * 100)}%`} />
                  </span>
                  <span>{value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : null}
          <p class="muted">
            あなたが調べた項目:{' '}
            {reveal.human.inspected.length === 0
              ? 'なし'
              : reveal.human.inspected.map((item) => INSPECTED_LABELS[item]).join('、')}
          </p>
          {reveal.missedByHuman.length > 0 ? (
            <p class="muted">
              見なかったもの: {reveal.missedByHuman.map((item) => INSPECTED_LABELS[item]).join('、')}
            </p>
          ) : null}
        </details>
      ))}

      <p>
        <a href="/">もう一度遊ぶ</a>
      </p>
    </main>,
    {
      title: meta.title,
      description: meta.description,
      image: meta.image,
      canonical: meta.url,
    },
  );
});
