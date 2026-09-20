import {
  ANOMALY_LABELS,
  ASPECT_LABELS,
  BODY_SCAN_LABELS,
  COUNTRY_LABELS,
  CRIMINAL_LABELS,
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
import type {
  BodyScanFinding,
  Dossier,
  InspectedItem,
  QuestionId,
  Reveal,
  Verdict,
} from '@game/domain';
import { useEffect, useState } from 'hono/jsx';
import { browser, goTo, readSession, writeSession } from './browser.js';
import { numberValue } from './dom.js';

const FOLLOW_UP_UNLOCKED_AFTER = 3;
const MIN_SCAN_MS = 1600;

type CenterTab = 'identity' | 'boarding_pass' | 'belongings';
type RightTab = 'interview' | 'mouth' | 'xray' | 'record';

interface Totals {
  human: number;
  jev: number;
}

const totalsKey = (shiftId: string) => `totals:${shiftId}`;

const Row = ({ label, children }: { label: string; children: unknown }) => (
  <div class="flex justify-between gap-3 border-b border-base-300 py-1.5 last:border-0">
    <span class="shrink-0 text-sm opacity-60">{label}</span>
    <span class="text-right tabular-nums">{children}</span>
  </div>
);

export default function Checkpoint({ shiftId, index }: { shiftId: string; index: number }) {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [failed, setFailed] = useState(false);
  const [centerTab, setCenterTab] = useState<CenterTab>('identity');
  const [rightTab, setRightTab] = useState<RightTab>('interview');
  const [asked, setAsked] = useState<QuestionId[]>([]);
  const [passportInspected, setPassportInspected] = useState(false);
  const [mouthChecked, setMouthChecked] = useState(false);
  const [xrayUsedOn, setXrayUsedOn] = useState<number | null>(null);
  const [bodyScan, setBodyScan] = useState<BodyScanFinding | null>(null);
  const [scanning, setScanning] = useState(false);
  const [confidence, setConfidence] = useState(0.8);
  const [inspected, setInspected] = useState<InspectedItem[]>(['identity']);
  const [startedAt] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [newsflash, setNewsflash] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [totals, setTotals] = useState<Totals>({ human: 0, jev: 0 });

  const mark = (item: InspectedItem) =>
    setInspected((current) => (current.includes(item) ? current : [...current, item]));

  useEffect(() => {
    setTotals(readSession<Totals>(totalsKey(shiftId), { human: 0, jev: 0 }));
    void (async () => {
      const response = await fetch(`/api/shift/${shiftId}/passenger/${index}`);
      if (!response.ok) {
        setFailed(true);
        return;
      }
      const body = (await response.json()) as {
        dossier: Dossier;
        xrayUsedOn: number | null;
        bodyScan: BodyScanFinding | null;
      };
      setDossier(body.dossier);
      setXrayUsedOn(body.xrayUsedOn);
      setBodyScan(body.bodyScan);
      if (body.bodyScan !== null) mark('body_scan');
    })();
  }, [shiftId, index]);

  useEffect(() => {
    if (reveal !== null) return;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 200);
    return () => clearInterval(timer);
  }, [reveal, startedAt]);

  const openCenter = (tab: CenterTab) => {
    setCenterTab(tab);
    mark(tab);
  };

  const openRight = (tab: RightTab) => {
    setRightTab(tab);
    if (tab === 'record') mark('record');
  };

  const runXray = async () => {
    if (scanning || xrayUsedOn !== null) return;
    setScanning(true);

    const [response] = await Promise.all([
      fetch(`/api/shift/${shiftId}/passenger/${index}/xray`, { method: 'POST' }),
      new Promise((resolve) => setTimeout(resolve, MIN_SCAN_MS)),
    ]);

    if (response.ok) {
      const body = (await response.json()) as { finding: BodyScanFinding; usedOn: number };
      setBodyScan(body.finding);
      setXrayUsedOn(body.usedOn);
      mark('body_scan');
    }
    setScanning(false);
  };

  const ask = (id: QuestionId) => {
    if (asked.includes(id)) return;
    setAsked([...asked, id]);
    mark(`question:${id}`);
  };

  const submit = async (verdict: Verdict) => {
    if (dossier === null || submitting || reveal !== null) return;
    setSubmitting(true);

    const response = await fetch(`/api/shift/${shiftId}/passenger/${index}/verdict`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ verdict, confidence, elapsedMs: Date.now() - startedAt, inspected }),
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
      if (event.key === 'ArrowDown')
        setConfidence((c) => Math.max(0.5, Math.round((c - 0.1) * 10) / 10));
      if (event.key === '1') openCenter('identity');
      if (event.key === '2') openCenter('boarding_pass');
      if (event.key === '3') openCenter('belongings');
      if (event.key === 'q' || event.key === 'Q') openRight('interview');
      if (event.key === 'm' || event.key === 'M') openRight('mouth');
      if (event.key === 'x' || event.key === 'X') openRight('xray');
      if (event.key === 'r' || event.key === 'R') openRight('record');
    };

    browser.addEventListener('keydown', onKey);
    return () => browser.removeEventListener('keydown', onKey);
  });

  if (failed) {
    return (
      <div role="alert" class="alert alert-error">
        <span>
          このシフトは見つかりませんでした。
          <a class="link" href="/">
            タイトルに戻る
          </a>
        </span>
      </div>
    );
  }

  if (dossier === null) {
    return (
      <div class="flex items-center gap-3 opacity-70">
        <span class="loading loading-spinner" />
        乗客を呼び出しています…
      </div>
    );
  }

  const followUpUnlocked = asked.length >= FOLLOW_UP_UNLOCKED_AFTER;

  return (
    <>
      {newsflash ? (
        <div class="fixed inset-0 z-50 grid place-items-center bg-error/15 backdrop-blur-sm">
          <div class="card border border-error bg-neutral shadow-xl">
            <div class="card-body items-center text-center">
              <span class="badge badge-error badge-lg tracking-[0.2em]">ニュース速報</span>
              <p class="mt-2 text-2xl font-bold text-error sm:text-4xl">
                {dossier.boardingPass.flightNo} 便がハイジャック
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div class="navbar mb-4 min-h-0 rounded-box border border-base-300 bg-base-200 px-4 py-2">
        <div class="flex flex-1 flex-wrap items-center gap-4 text-sm">
          <span class="tabular-nums">
            {index + 1} / {PASSENGERS_PER_SHIFT} 人目
          </span>
          <span class="tabular-nums opacity-70">
            経過 {formatDuration(reveal?.human.elapsedMs ?? elapsed)}
          </span>
          <span class="tabular-nums">
            人間 <span class="font-bold">{totals.human}</span>
          </span>
        </div>
        <span class="badge badge-outline">Jev 封印済</span>
      </div>

      {reveal === null ? (
        <>
          <div class="grid gap-4 lg:grid-cols-[260px_1fr_1fr]">
            <div class="card border border-base-300 bg-base-200">
              <div class="card-body gap-3 p-4">
                <div class="flex gap-1.5">
                  {Array.from({ length: PASSENGERS_PER_SHIFT }, (_, i) => (
                    <span
                      key={i}
                      class={`h-2.5 w-2.5 rounded-full border border-base-300 ${
                        i < index ? 'bg-accent' : i === index ? 'bg-primary' : ''
                      }`}
                    />
                  ))}
                </div>
                <div
                  class={`mx-auto block w-full max-w-56 ${
                    scanning ? 'aura aura-holo aura-lg duration-[1.5s]' : ''
                  }`}
                >
                  <img
                    class="portrait w-full rounded-box border border-base-300 bg-neutral"
                    src={passengerImage(dossier.appearance.archetype, dossier.appearance.demeanor)}
                    alt=""
                  />
                </div>
                <div>
                  態度:{' '}
                  <span class="badge badge-warning badge-sm">
                    {DEMEANOR_LABELS[dossier.appearance.demeanor]}
                  </span>
                  <div class="text-sm opacity-60">{dossier.appearance.ageBand}</div>
                </div>
                {dossier.appearance.notableItems.length > 0 ? (
                  <p class="text-sm opacity-60">
                    目立つ持ち物: {dossier.appearance.notableItems.join('、')}
                  </p>
                ) : null}
              </div>
            </div>

            <div class="card border border-base-300 bg-base-200">
              <div class="card-body gap-3 p-4">
                <div role="tablist" class="tabs tabs-box">
                  <button
                    type="button"
                    role="tab"
                    class={`tab ${centerTab === 'identity' ? 'tab-active' : ''}`}
                    onClick={() => openCenter('identity')}
                  >
                    身分証 (1)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class={`tab ${centerTab === 'boarding_pass' ? 'tab-active' : ''}`}
                    onClick={() => openCenter('boarding_pass')}
                  >
                    搭乗券 (2)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class={`tab ${centerTab === 'belongings' ? 'tab-active' : ''}`}
                    onClick={() => openCenter('belongings')}
                  >
                    手荷物 (3)
                  </button>
                </div>

                {centerTab === 'identity' ? (
                  <>
                    <div>
                      <Row label="種別">{ID_KIND_LABELS[dossier.identity.kind]}</Row>
                      <Row label="氏名">{dossier.identity.fullName}</Row>
                      <Row label="国籍">
                        {COUNTRY_LABELS[dossier.identity.nationality] ??
                          dossier.identity.nationality}
                      </Row>
                      <Row label="生年月日">{dossier.identity.birthDate}</Row>
                      <Row label="有効期限">
                        {dossier.identity.expiresOn}
                        {dossier.identity.anomalies.length > 0 ? (
                          <span class="ml-1 text-warning">⚠</span>
                        ) : null}
                      </Row>
                      <Row label="写真一致度">{PHOTO_MATCH_LABELS[dossier.identity.photoMatch]}</Row>
                    </div>

                    {dossier.identity.anomalies.length > 0 ? (
                      <div role="alert" class="alert alert-warning alert-soft py-2">
                        <span>
                          {dossier.identity.anomalies.map((a) => ANOMALY_LABELS[a]).join('、')}
                        </span>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      class="btn btn-outline btn-sm"
                      onClick={() => {
                        setPassportInspected(true);
                        mark('passport_inspection');
                      }}
                      disabled={passportInspected}
                    >
                      パスポートを精査
                    </button>

                    {passportInspected ? (
                      dossier.identity.inspection.length === 0 ? (
                        <p class="text-sm opacity-60">所見: 異常なし</p>
                      ) : (
                        <ul class="list">
                          {dossier.identity.inspection.map((o) => (
                            <li class="list-row px-0 py-1 text-warning" key={o}>
                              所見: {FORGERY_LABELS[o]}
                            </li>
                          ))}
                        </ul>
                      )
                    ) : null}
                  </>
                ) : null}

                {centerTab === 'boarding_pass' ? (
                  <div>
                    <Row label="便名">{dossier.boardingPass.flightNo}</Row>
                    <Row label="行き先">{dossier.boardingPass.destination}</Row>
                    <Row label="座席">{dossier.boardingPass.seat}</Row>
                    <Row label="種別">{TRIP_TYPE_LABELS[dossier.boardingPass.tripType]}</Row>
                    <Row label="購入方法">{PAYMENT_LABELS[dossier.boardingPass.payment]}</Row>
                    <Row label="購入時期">
                      出発の {dossier.boardingPass.purchasedDaysBefore} 日前
                    </Row>
                    <Row label="預け荷物">{dossier.boardingPass.checkedBags} 個</Row>
                  </div>
                ) : null}

                {centerTab === 'belongings' ? (
                  <ul class="flex flex-col gap-2">
                    {dossier.belongings.map((item) => (
                      <li class="flex flex-wrap items-center gap-2" key={item.kind}>
                        <span>
                          {ITEM_LABELS[item.kind] ?? item.kind} × {item.quantity}
                        </span>
                        {item.flags.map((flag) => (
                          <span
                            key={flag}
                            class={`badge badge-sm ${
                              flag === 'suspicious' || flag === 'tool'
                                ? 'badge-warning'
                                : 'badge-ghost'
                            }`}
                          >
                            {FLAG_LABELS[flag]}
                          </span>
                        ))}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <div class="card border border-base-300 bg-base-200">
              <div class="card-body gap-3 p-4">
                <div role="tablist" class="tabs tabs-box">
                  <button
                    type="button"
                    role="tab"
                    class={`tab ${rightTab === 'interview' ? 'tab-active' : ''}`}
                    onClick={() => openRight('interview')}
                  >
                    質問 (Q)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class={`tab ${rightTab === 'mouth' ? 'tab-active' : ''}`}
                    onClick={() => openRight('mouth')}
                  >
                    口内検査 (M)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class={`tab ${rightTab === 'xray' ? 'tab-active' : ''}`}
                    onClick={() => openRight('xray')}
                  >
                    X 線 (X)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class={`tab ${rightTab === 'record' ? 'tab-active' : ''}`}
                    onClick={() => openRight('record')}
                  >
                    照会 (R)
                  </button>
                </div>

                {rightTab === 'interview' ? (
                  <>
                    {dossier.interview
                      .filter((exchange) => asked.includes(exchange.id))
                      .map((exchange) => (
                        <div class="border-l-2 border-base-300 pl-3" key={exchange.id}>
                          <p class="text-sm opacity-60">Q {exchange.question}</p>
                          <p>A {exchange.answer}</p>
                          <span
                            class={`badge badge-xs ${
                              exchange.tone === 'steady' ? 'badge-ghost' : 'badge-warning'
                            }`}
                          >
                            {TONE_LABELS[exchange.tone]}
                          </span>
                        </div>
                      ))}

                    <h3 class="text-xs tracking-widest opacity-60">まだ聞いていない質問</h3>
                    <div class="flex flex-col gap-2">
                      {dossier.interview
                        .filter((exchange) => !asked.includes(exchange.id))
                        .map((exchange) => {
                          const locked = exchange.id === 'follow_up' && !followUpUnlocked;
                          return (
                            <button
                              type="button"
                              key={exchange.id}
                              class={`btn btn-sm justify-start ${
                                exchange.id === 'follow_up' ? 'btn-outline btn-warning' : 'btn-ghost'
                              }`}
                              disabled={locked}
                              onClick={() => ask(exchange.id)}
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
                ) : null}

                {rightTab === 'mouth' ? (
                  <>
                    <button
                      type="button"
                      class="btn btn-outline btn-sm"
                      onClick={() => {
                        setMouthChecked(true);
                        mark('mouth');
                      }}
                      disabled={mouthChecked}
                    >
                      口を開けてもらう
                    </button>
                    {mouthChecked ? (
                      <p
                        class={
                          dossier.mouth.finding === 'clear' ? 'opacity-60' : 'font-bold text-warning'
                        }
                      >
                        所見: {MOUTH_LABELS[dossier.mouth.finding]}
                      </p>
                    ) : null}
                  </>
                ) : null}

                {rightTab === 'xray' ? (
                  <>
                    {bodyScan === null ? (
                      <>
                        <div role="alert" class="alert alert-warning alert-soft py-2">
                          <span>
                            X 線検査は <b>1 シフトに 1 回だけ</b>。使いどころを選んでください。
                          </span>
                        </div>
                        <div
                          class={`self-start ${
                            xrayUsedOn === null
                              ? scanning
                                ? 'aura aura-holo aura-lg duration-[1.5s]'
                                : 'aura aura-lg text-warning'
                              : ''
                          }`}
                        >
                          <button
                            type="button"
                            class="btn btn-warning"
                            onClick={runXray}
                            disabled={scanning || xrayUsedOn !== null}
                          >
                            {scanning ? (
                              <>
                                <span class="loading loading-bars loading-sm" />
                                スキャン中…
                              </>
                            ) : xrayUsedOn !== null ? (
                              `使用済み（${xrayUsedOn + 1} 人目）`
                            ) : (
                              'この乗客に X 線検査を使う'
                            )}
                          </button>
                        </div>
                      </>
                    ) : bodyScan === 'clear' || bodyScan === 'unreadable' ? (
                      <>
                        <div role="alert" class="alert alert-soft">
                          <span>所見: {BODY_SCAN_LABELS[bodyScan]}</span>
                        </div>
                        <p class="text-sm opacity-60">このシフトの X 線検査はもう使えません。</p>
                      </>
                    ) : (
                      <>
                        <div class="aura aura-glow aura-xl block text-error duration-[2s]">
                          <div role="alert" class="alert alert-error">
                            <span class="font-bold">所見: {BODY_SCAN_LABELS[bodyScan]}</span>
                          </div>
                        </div>
                        <p class="text-sm opacity-60">このシフトの X 線検査はもう使えません。</p>
                      </>
                    )}
                  </>
                ) : null}

                {rightTab === 'record' ? (
                  <>
                    <div>
                      <Row label="前歴">{CRIMINAL_LABELS[dossier.record.criminalHistory]}</Row>
                      <Row label="監視リスト">
                        <span class={dossier.record.watchlistHit ? 'font-bold text-error' : ''}>
                          {dossier.record.watchlistHit ? '該当' : '該当なし'}
                        </span>
                      </Row>
                      <Row label="渡航回数">過去 1 年で {dossier.record.tripsLastYear} 回</Row>
                      <Row label="渡航目的">
                        {PURPOSE_LABELS[dossier.purpose.stated]}・{dossier.purpose.stayDays} 日・同行{' '}
                        {dossier.purpose.companions} 名
                      </Row>
                    </div>

                    <h3 class="text-xs tracking-widest opacity-60">居住歴</h3>
                    <ul class="flex flex-col gap-1.5">
                      {dossier.residenceHistory.map((entry) => (
                        <li class="flex items-center gap-2" key={entry.country}>
                          <span>
                            {COUNTRY_LABELS[entry.country] ?? entry.country}・{entry.years} 年
                          </span>
                          <span
                            class={`badge badge-sm ${
                              entry.stability === 'conflict' ? 'badge-error' : 'badge-ghost'
                            }`}
                          >
                            {STABILITY_LABELS[entry.stability]}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      onClick={() => mark('residence')}
                    >
                      居住歴を確認した
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap items-end gap-4 rounded-box border border-base-300 bg-base-200 p-4">
            <label class="grow">
              <span class="text-sm opacity-70">
                確信度 <span class="font-bold tabular-nums">{Math.round(confidence * 100)}%</span>
              </span>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={String(Math.round(confidence * 100))}
                class="range range-primary"
                onInput={(e) => setConfidence(numberValue(e) / 100)}
              />
            </label>
            <div class="flex gap-3">
              <button
                type="button"
                class="btn btn-error btn-lg"
                disabled={submitting}
                onClick={() => submit('detain')}
              >
                ← 拘束 (A)
              </button>
              <button
                type="button"
                class="btn btn-success btn-lg"
                disabled={submitting}
                onClick={() => submit('pass')}
              >
                通過 (D) →
              </button>
            </div>
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
    <div class="flex flex-col gap-4">
      <p
        class={`text-center text-xl font-bold tracking-widest ${
          reveal.truth.isThreat ? 'text-error' : 'text-success'
        }`}
      >
        真実: {reveal.truth.isThreat ? '脅威（ハイジャック計画）' : '無害な乗客'}
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="card border border-base-300 bg-base-200">
          <div class="card-body">
            <h2 class="card-title text-base">
              あなた
              <span class="text-sm font-normal opacity-60">
                （{formatDuration(reveal.human.elapsedMs)}）
              </span>
            </h2>
            <p>
              {reveal.human.verdict === 'detain' ? '拘束' : '通過'}・確信度{' '}
              {Math.round(reveal.human.confidence * 100)}%
            </p>
            <p
              class={`text-3xl font-bold tabular-nums ${
                reveal.human.points >= 0 ? 'text-success' : 'text-error'
              }`}
            >
              {reveal.human.points >= 0 ? '+' : ''}
              {reveal.human.points}
            </p>
          </div>
        </div>

        <div class="card border border-base-300 bg-base-200">
          <div class="card-body">
            <h2 class="card-title text-base">
              Jev
              <span class="text-sm font-normal opacity-60">（{formatDuration(jev.latencyMs)}）</span>
            </h2>
            {jev.decision.kind === 'decided' ? (
              <>
                <p>
                  {jev.decision.verdict === 'detain' ? '拘束' : '通過'}・確信度{' '}
                  {Math.round(jev.decision.verdictConfidence * 100)}%
                </p>
                <p class="text-sm opacity-60">
                  ハイジャック計画の見立て {jev.decision.threatProbability.toFixed(2)}
                </p>
                <p
                  class={`text-3xl font-bold tabular-nums ${
                    jev.points >= 0 ? 'text-success' : 'text-error'
                  }`}
                >
                  {jev.points >= 0 ? '+' : ''}
                  {jev.points}
                </p>

                <h3 class="mt-2 text-xs tracking-widest opacity-60">着眼点</h3>
                {Object.entries(jev.decision.aspects).map(([id, value]) => (
                  <div class="grid grid-cols-[4rem_1fr_2.5rem] items-center gap-2 text-sm" key={id}>
                    <span class="opacity-70">
                      {ASPECT_LABELS[id as keyof typeof ASPECT_LABELS]}
                    </span>
                    <progress class="progress progress-primary" value={value} max={1} />
                    <span class="text-right tabular-nums">{value.toFixed(2)}</span>
                  </div>
                ))}
              </>
            ) : (
              <p class="opacity-60">回線エラー（判定不能・0 点）</p>
            )}
          </div>
        </div>
      </div>

      {reveal.missedByHuman.length > 0 ? (
        <div role="alert" class="alert alert-warning alert-soft">
          <span>
            あなたが見なかったもの:{' '}
            {reveal.missedByHuman.map((item) => INSPECTED_LABELS[item]).join('、')}
          </span>
        </div>
      ) : null}

      <div class="navbar min-h-0 rounded-box border border-base-300 bg-base-200 px-4 py-2">
        <div class="flex flex-1 flex-wrap gap-4">
          <span class="tabular-nums">
            累計 人間 <span class="font-bold">{totals.human}</span>
          </span>
          <span class="tabular-nums">
            Jev <span class="font-bold">{totals.jev}</span>
          </span>
        </div>
        <button type="button" class="btn btn-primary" onClick={onNext}>
          {index + 1 < PASSENGERS_PER_SHIFT ? '次の乗客 →' : '結果を見る →'}
        </button>
      </div>
    </div>
  );
}
