import {
  ANOMALY_LABELS,
  ASPECT_LABELS,
  CRIMINAL_LABELS,
  COUNTRY_LABELS,
  DEMEANOR_LABELS,
  FLAG_LABELS,
  FORGERY_LABELS,
  ID_KIND_LABELS,
  INSPECTED_LABELS,
  ITEM_LABELS,
  MOUTH_LABELS,
  PASSENGERS_PER_SHIFT,
  PAYMENT_LABELS,
  PHOTO_MATCH_LABELS,
  PURPOSE_LABELS,
  STABILITY_LABELS,
  TONE_LABELS,
  TRIP_TYPE_LABELS,
  formatDuration,
  passengerImage,
} from '@game/domain/display';
import type { Dossier, InspectedItem, QuestionId, Reveal, Verdict } from '@game/domain';
import { useEffect, useState } from 'hono/jsx';
import { browser, goTo, readSession, writeSession } from './browser.js';
import { numberValue } from './dom.js';

const FOLLOW_UP_UNLOCKED_AFTER = 3;

type CenterTab = 'identity' | 'boarding_pass' | 'belongings';
type RightTab = 'interview' | 'mouth' | 'record';

interface Totals {
  human: number;
  jev: number;
}

const totalsKey = (shiftId: string) => `totals:${shiftId}`;

export default function Checkpoint({ shiftId, index }: { shiftId: string; index: number }) {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [failed, setFailed] = useState(false);
  const [centerTab, setCenterTab] = useState<CenterTab>('identity');
  const [rightTab, setRightTab] = useState<RightTab>('interview');
  const [asked, setAsked] = useState<QuestionId[]>([]);
  const [passportInspected, setPassportInspected] = useState(false);
  const [mouthChecked, setMouthChecked] = useState(false);
  const [confidence, setConfidence] = useState(0.8);
  const [inspected, setInspected] = useState<InspectedItem[]>(['identity']);
  const [startedAt] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [newsflash, setNewsflash] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [totals, setTotals] = useState<Totals>({ human: 0, jev: 0 });

  useEffect(() => {
    setTotals(readSession<Totals>(totalsKey(shiftId), { human: 0, jev: 0 }));
    void (async () => {
      const response = await fetch(`/api/shift/${shiftId}/passenger/${index}`);
      if (!response.ok) {
        setFailed(true);
        return;
      }
      const body = (await response.json()) as { dossier: Dossier };
      setDossier(body.dossier);
    })();
  }, [shiftId, index]);

  useEffect(() => {
    if (reveal !== null) return;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 200);
    return () => clearInterval(timer);
  }, [reveal, startedAt]);

  const mark = (item: InspectedItem) =>
    setInspected((current) => (current.includes(item) ? current : [...current, item]));

  const openCenter = (tab: CenterTab) => {
    setCenterTab(tab);
    mark(tab);
  };

  const openRight = (tab: RightTab) => {
    setRightTab(tab);
    if (tab === 'record') mark('record');
  };

  const ask = (id: QuestionId) => {
    if (asked.includes(id)) return;
    setAsked([...asked, id]);
    mark(`question:${id}`);
  };

  const inspectPassport = () => {
    setPassportInspected(true);
    mark('passport_inspection');
  };

  const checkMouth = () => {
    setMouthChecked(true);
    mark('mouth');
  };

  const submit = async (verdict: Verdict) => {
    if (dossier === null || submitting || reveal !== null) return;
    setSubmitting(true);

    const response = await fetch(`/api/shift/${shiftId}/passenger/${index}/verdict`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        verdict,
        confidence,
        elapsedMs: Date.now() - startedAt,
        inspected,
      }),
    });

    if (!response.ok && response.status !== 409) {
      setSubmitting(false);
      setFailed(true);
      return;
    }

    const body = (await response.json()) as Reveal;
    const next = {
      human: totals.human + body.human.points,
      jev: totals.jev + body.jev.points,
    };
    writeSession(totalsKey(shiftId), next);
    setTotals(next);

    if (body.human.hijackOccurred) {
      setNewsflash(true);
      setTimeout(() => setNewsflash(false), 2000);
    }
    setReveal(body);
    setSubmitting(false);
  };

  const next = async () => {
    if (index + 1 < PASSENGERS_PER_SHIFT) {
      goTo(`/play/${shiftId}/${index + 1}`);
      return;
    }
    const response = await fetch(`/api/shift/${shiftId}/finish`, { method: 'POST' });
    if (!response.ok) {
      setFailed(true);
      return;
    }
    const body = (await response.json()) as { resultId: string };
    goTo(`/r/${body.resultId}`);
  };

  useEffect(() => {
    const onKey = (event: { key: string; preventDefault(): void }) => {
      if (reveal !== null) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          void next();
        }
        return;
      }
      if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft') void submit('detain');
      if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') void submit('pass');
      if (event.key === 'ArrowUp') setConfidence((c) => Math.min(1, Math.round((c + 0.1) * 10) / 10));
      if (event.key === 'ArrowDown') setConfidence((c) => Math.max(0.5, Math.round((c - 0.1) * 10) / 10));
      if (event.key === '1') openCenter('identity');
      if (event.key === '2') openCenter('boarding_pass');
      if (event.key === '3') openCenter('belongings');
      if (event.key === 'q' || event.key === 'Q') openRight('interview');
      if (event.key === 'm' || event.key === 'M') openRight('mouth');
      if (event.key === 'r' || event.key === 'R') openRight('record');
    };

    browser.addEventListener('keydown', onKey);
    return () => browser.removeEventListener('keydown', onKey);
  });

  if (failed) {
    return (
      <p class="error">
        このシフトは見つかりませんでした。<a href="/">タイトルに戻る</a>
      </p>
    );
  }

  if (dossier === null) return <p class="muted">乗客を呼び出しています…</p>;

  const followUpUnlocked = asked.length >= FOLLOW_UP_UNLOCKED_AFTER;

  return (
    <>
      {newsflash ? (
        <div class="newsflash">
          <div>
            <strong>ニュース速報</strong>
            <p>{dossier.boardingPass.flightNo} 便がハイジャック</p>
          </div>
        </div>
      ) : null}

      <div class="hud">
        <span>
          {index + 1} / {PASSENGERS_PER_SHIFT} 人目
        </span>
        <span>経過 {formatDuration(reveal?.human.elapsedMs ?? elapsed)}</span>
        <span>
          人間 <strong>{totals.human}</strong>
        </span>
        <span class="spacer badge">Jev 封印済</span>
      </div>

      {reveal === null ? (
        <>
          <div class="columns">
            <section class="panel">
              <div class="queue">
                {Array.from({ length: PASSENGERS_PER_SHIFT }, (_, i) => (
                  <span key={i} class={i < index ? 'done' : i === index ? 'current' : ''} />
                ))}
              </div>
              <img
                class="portrait"
                src={passengerImage(dossier.appearance.archetype, dossier.appearance.demeanor)}
                alt=""
              />
              <p>
                態度: <strong>{DEMEANOR_LABELS[dossier.appearance.demeanor]}</strong>
                <br />
                <span class="muted">{dossier.appearance.ageBand}</span>
              </p>
              {dossier.appearance.notableItems.length > 0 ? (
                <p class="muted">目立つ持ち物: {dossier.appearance.notableItems.join('、')}</p>
              ) : null}
            </section>

            <section class="panel">
              <div class="tabs" role="tablist">
                <button type="button" aria-selected={centerTab === 'identity'} onClick={() => openCenter('identity')}>
                  身分証 (1)
                </button>
                <button
                  type="button"
                  aria-selected={centerTab === 'boarding_pass'}
                  onClick={() => openCenter('boarding_pass')}
                >
                  搭乗券 (2)
                </button>
                <button type="button" aria-selected={centerTab === 'belongings'} onClick={() => openCenter('belongings')}>
                  手荷物 (3)
                </button>
              </div>

              {centerTab === 'identity' ? (
                <>
                  <dl class="rows">
                    <dt>種別</dt>
                    <dd>{ID_KIND_LABELS[dossier.identity.kind]}</dd>
                    <dt>氏名</dt>
                    <dd>{dossier.identity.fullName}</dd>
                    <dt>国籍</dt>
                    <dd>{COUNTRY_LABELS[dossier.identity.nationality] ?? dossier.identity.nationality}</dd>
                    <dt>生年月日</dt>
                    <dd>{dossier.identity.birthDate}</dd>
                    <dt>有効期限</dt>
                    <dd>
                      {dossier.identity.expiresOn}
                      {dossier.identity.anomalies.length > 0 ? <span class="flag"> ⚠</span> : null}
                    </dd>
                    <dt>写真一致度</dt>
                    <dd>{PHOTO_MATCH_LABELS[dossier.identity.photoMatch]}</dd>
                  </dl>
                  {dossier.identity.anomalies.length > 0 ? (
                    <p class="flag">
                      ⚠ {dossier.identity.anomalies.map((a) => ANOMALY_LABELS[a]).join('、')}
                    </p>
                  ) : null}
                  <p>
                    <button type="button" onClick={inspectPassport} disabled={passportInspected}>
                      パスポートを精査
                    </button>
                  </p>
                  {passportInspected ? (
                    dossier.identity.inspection.length === 0 ? (
                      <p class="muted">所見: 異常なし</p>
                    ) : (
                      <ul class="plain">
                        {dossier.identity.inspection.map((o) => (
                          <li class="flag" key={o}>
                            所見: {FORGERY_LABELS[o]}
                          </li>
                        ))}
                      </ul>
                    )
                  ) : null}
                </>
              ) : null}

              {centerTab === 'boarding_pass' ? (
                <dl class="rows">
                  <dt>便名</dt>
                  <dd>{dossier.boardingPass.flightNo}</dd>
                  <dt>行き先</dt>
                  <dd>{dossier.boardingPass.destination}</dd>
                  <dt>座席</dt>
                  <dd>{dossier.boardingPass.seat}</dd>
                  <dt>種別</dt>
                  <dd>{TRIP_TYPE_LABELS[dossier.boardingPass.tripType]}</dd>
                  <dt>購入方法</dt>
                  <dd>{PAYMENT_LABELS[dossier.boardingPass.payment]}</dd>
                  <dt>購入時期</dt>
                  <dd>出発の {dossier.boardingPass.purchasedDaysBefore} 日前</dd>
                  <dt>預け荷物</dt>
                  <dd>{dossier.boardingPass.checkedBags} 個</dd>
                </dl>
              ) : null}

              {centerTab === 'belongings' ? (
                <ul class="plain">
                  {dossier.belongings.map((item) => (
                    <li key={item.kind}>
                      {ITEM_LABELS[item.kind] ?? item.kind} × {item.quantity}{' '}
                      {item.flags.map((flag) => (
                        <span class={`chip ${flag}`} key={flag}>
                          {FLAG_LABELS[flag]}
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section class="panel">
              <div class="tabs" role="tablist">
                <button type="button" aria-selected={rightTab === 'interview'} onClick={() => openRight('interview')}>
                  質問 (Q)
                </button>
                <button type="button" aria-selected={rightTab === 'mouth'} onClick={() => openRight('mouth')}>
                  口内検査 (M)
                </button>
                <button type="button" aria-selected={rightTab === 'record'} onClick={() => openRight('record')}>
                  照会 (R)
                </button>
              </div>

              {rightTab === 'interview' ? (
                <>
                  {dossier.interview
                    .filter((exchange) => asked.includes(exchange.id))
                    .map((exchange) => (
                      <div class="qa" key={exchange.id}>
                        <p class="q">Q {exchange.question}</p>
                        <p>A {exchange.answer}</p>
                        <p class="tone">{TONE_LABELS[exchange.tone]}</p>
                      </div>
                    ))}
                  <h2>まだ聞いていない質問</h2>
                  <ul class="plain">
                    {dossier.interview
                      .filter((exchange) => !asked.includes(exchange.id))
                      .map((exchange) => {
                        const locked = exchange.id === 'follow_up' && !followUpUnlocked;
                        return (
                          <li key={exchange.id}>
                            <button type="button" disabled={locked} onClick={() => ask(exchange.id)}>
                              {exchange.id === 'follow_up' ? '追い質問 ⚡' : exchange.question}
                            </button>
                            {locked ? (
                              <span class="muted"> （3 問聞くと解放）</span>
                            ) : null}
                          </li>
                        );
                      })}
                  </ul>
                </>
              ) : null}

              {rightTab === 'mouth' ? (
                <>
                  <button type="button" onClick={checkMouth} disabled={mouthChecked}>
                    口を開けてもらう
                  </button>
                  {mouthChecked ? (
                    <p class={dossier.mouth.finding === 'clear' ? 'muted' : 'flag'}>
                      所見: {MOUTH_LABELS[dossier.mouth.finding]}
                    </p>
                  ) : null}
                </>
              ) : null}

              {rightTab === 'record' ? (
                <>
                  <dl class="rows">
                    <dt>前歴</dt>
                    <dd>{CRIMINAL_LABELS[dossier.record.criminalHistory]}</dd>
                    <dt>監視リスト</dt>
                    <dd class={dossier.record.watchlistHit ? 'flag' : ''}>
                      {dossier.record.watchlistHit ? '該当' : '該当なし'}
                    </dd>
                    <dt>渡航回数</dt>
                    <dd>過去 1 年で {dossier.record.tripsLastYear} 回</dd>
                    <dt>渡航目的</dt>
                    <dd>
                      {PURPOSE_LABELS[dossier.purpose.stated]}・{dossier.purpose.stayDays} 日・同行{' '}
                      {dossier.purpose.companions} 名
                    </dd>
                  </dl>
                  <h2>居住歴</h2>
                  <ul class="plain">
                    {dossier.residenceHistory.map((entry) => (
                      <li key={entry.country}>
                        {COUNTRY_LABELS[entry.country] ?? entry.country}・{entry.years} 年
                        <span class={`chip ${entry.stability === 'conflict' ? 'suspicious' : ''}`}>
                          {STABILITY_LABELS[entry.stability]}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p>
                    <button type="button" onClick={() => mark('residence')}>
                      居住歴を確認した
                    </button>
                  </p>
                </>
              ) : null}
            </section>
          </div>

          <div class="actions">
            <label>
              確信度 <strong>{Math.round(confidence * 100)}%</strong>
              <br />
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={String(Math.round(confidence * 100))}
                onInput={(e) => setConfidence(numberValue(e) / 100)}
              />
            </label>
            <button type="button" class="detain grow" disabled={submitting} onClick={() => submit('detain')}>
              ← 拘束 (A)
            </button>
            <button type="button" class="pass" disabled={submitting} onClick={() => submit('pass')}>
              通過 (D) →
            </button>
          </div>
        </>
      ) : (
        <RevealCard reveal={reveal} totals={totals} index={index} onNext={next} />
      )}
    </>
  );
}

function RevealCard({
  reveal,
  totals,
  index,
  onNext,
}: {
  reveal: Reveal;
  totals: Totals;
  index: number;
  onNext: () => void;
}) {
  const jev = reveal.jev;

  return (
    <div class="reveal">
      <p class={`truth ${reveal.truth.isThreat ? 'threat' : 'benign'}`}>
        真実: {reveal.truth.isThreat ? '脅威（ハイジャック計画）' : '無害な乗客'}
      </p>

      <div class="verdict-grid">
        <section class="panel">
          <h2>あなた（{formatDuration(reveal.human.elapsedMs)}）</h2>
          <p>
            {reveal.human.verdict === 'detain' ? '拘束' : '通過'}・確信度{' '}
            {Math.round(reveal.human.confidence * 100)}%
          </p>
          <p class={`points ${reveal.human.points >= 0 ? 'plus' : 'minus'}`}>
            {reveal.human.points >= 0 ? '+' : ''}
            {reveal.human.points}
          </p>
        </section>

        <section class="panel">
          <h2>Jev（{formatDuration(jev.latencyMs)}）</h2>
          {jev.decision.kind === 'decided' ? (
            <>
              <p>
                {jev.decision.verdict === 'detain' ? '拘束' : '通過'}・確信度{' '}
                {Math.round(jev.decision.verdictConfidence * 100)}%
              </p>
              <p class="muted">
                ハイジャック計画の見立て {jev.decision.threatProbability.toFixed(2)}
              </p>
              <p class={`points ${jev.points >= 0 ? 'plus' : 'minus'}`}>
                {jev.points >= 0 ? '+' : ''}
                {jev.points}
              </p>
              <h2>着眼点</h2>
              {Object.entries(jev.decision.aspects).map(([id, value]) => (
                <div class="bar" key={id}>
                  <span>{ASPECT_LABELS[id as keyof typeof ASPECT_LABELS]}</span>
                  <span class="track">
                    <span class="fill" style={`width:${Math.round(value * 100)}%`} />
                  </span>
                  <span>{value.toFixed(2)}</span>
                </div>
              ))}
            </>
          ) : (
            <p class="muted">回線エラー（判定不能・0 点）</p>
          )}
        </section>
      </div>

      {reveal.missedByHuman.length > 0 ? (
        <p class="muted">
          あなたが見なかったもの:{' '}
          {reveal.missedByHuman.map((item) => INSPECTED_LABELS[item]).join('、')}
        </p>
      ) : null}

      <div class="hud">
        <span>
          累計 人間 <strong>{totals.human}</strong>
        </span>
        <span>
          Jev <strong>{totals.jev}</strong>
        </span>
        <button type="button" class="spacer" onClick={onNext}>
          {index + 1 < PASSENGERS_PER_SHIFT ? '次の乗客 →' : '結果を見る →'}
        </button>
      </div>
    </div>
  );
}
