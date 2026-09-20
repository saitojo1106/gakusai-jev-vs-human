import {
  ANOMALY_LABELS,
  ASPECT_LABELS,
  COUNTRY_LABELS,
  CRIMINAL_LABELS,
  DEMEANOR_LABELS,
  FLAG_LABELS,
  FORGERY_LABELS,
  ID_KIND_LABELS,
  INSPECTED_LABELS,
  ITEM_LABELS,
  MOUTH_LABELS,
  NOTABLE_ITEM_LABELS,
  PASSENGERS_PER_SHIFT,
  PAYMENT_LABELS,
  PHOTO_MATCH_LABELS,
  PURPOSE_LABELS,
  STABILITY_LABELS,
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
import { InterviewPanel } from '../components/InterviewPanel.js';
import type { Locale } from '@game/domain';
import { ui } from '../i18n.js';
import { XrayDialog } from '../components/XrayDialog.js';
import { XrayPanel } from '../components/XrayPanel.js';
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

export default function Checkpoint({
  shiftId,
  index,
  locale,
}: { shiftId: string; index: number; locale: Locale }) {
  const t = ui(locale);
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
  const [scanOpen, setScanOpen] = useState(false);
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
      const response = await fetch(`/api/shift/${shiftId}/passenger/${index}?lang=${locale}`);
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
    setScanOpen(true);

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
          {t.shiftNotFound}
          <a class="link" href="/">
            {t.backToTitle}
          </a>
        </span>
      </div>
    );
  }

  if (dossier === null) {
    return (
      <div class="flex items-center gap-3 opacity-70">
        <span class="loading loading-spinner" />
        {t.callingPassenger}
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
              <span class="badge badge-error badge-lg tracking-[0.2em]">{t.newsflash}</span>
              <p class="mt-2 text-2xl font-bold text-error sm:text-4xl">
                {locale === 'ja'
                  ? `${dossier.boardingPass.flightNo} 便がハイジャック`
                  : `Flight ${dossier.boardingPass.flightNo} hijacked`}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div class="navbar mb-4 min-h-0 rounded-box border border-base-300 bg-base-200 px-4 py-2">
        <div class="flex flex-1 flex-wrap items-center gap-4 text-sm">
          <span class="tabular-nums">
            {t.passengerCounter(index + 1, PASSENGERS_PER_SHIFT)}
          </span>
          <span class="tabular-nums opacity-70">
            {t.elapsed} {formatDuration(reveal?.human.elapsedMs ?? elapsed, locale)}
          </span>
          <span class="tabular-nums">
            {t.human} <span class="font-bold">{totals.human}</span>
          </span>
        </div>
        <span class="badge badge-outline">{t.jevSealed}</span>
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
                  {t.demeanor}:{' '}
                  <span class="badge badge-warning badge-sm">
                    {DEMEANOR_LABELS[dossier.appearance.demeanor][locale]}
                  </span>
                  <div class="text-sm opacity-60">{dossier.appearance.ageBand}</div>
                </div>
                {dossier.appearance.notableItems.length > 0 ? (
                  <p class="text-sm opacity-60">
                    {t.notableItems}:{' '}
                    {dossier.appearance.notableItems
                      .map((item) => NOTABLE_ITEM_LABELS[item]?.[locale] ?? item)
                      .join(t.listSeparator)}
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
                    {t.tabIdentity}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class={`tab ${centerTab === 'boarding_pass' ? 'tab-active' : ''}`}
                    onClick={() => openCenter('boarding_pass')}
                  >
                    {t.tabBoardingPass}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class={`tab ${centerTab === 'belongings' ? 'tab-active' : ''}`}
                    onClick={() => openCenter('belongings')}
                  >
                    {t.tabBelongings}
                  </button>
                </div>

                {centerTab === 'identity' ? (
                  <>
                    <div>
                      <Row label={t.fieldKind}>{ID_KIND_LABELS[dossier.identity.kind][locale]}</Row>
                      <Row label={t.fieldName}>{dossier.identity.fullName}</Row>
                      <Row label={t.fieldNationality}>
                        {COUNTRY_LABELS[dossier.identity.nationality]?.[locale] ??
                          dossier.identity.nationality}
                      </Row>
                      <Row label={t.fieldBirthDate}>{dossier.identity.birthDate}</Row>
                      <Row label={t.fieldExpiry}>
                        {dossier.identity.expiresOn}
                        {dossier.identity.anomalies.length > 0 ? (
                          <span class="ml-1 text-warning">⚠</span>
                        ) : null}
                      </Row>
                      <Row label={t.fieldPhotoMatch}>{PHOTO_MATCH_LABELS[dossier.identity.photoMatch][locale]}</Row>
                    </div>

                    {dossier.identity.anomalies.length > 0 ? (
                      <div role="alert" class="alert alert-warning alert-soft py-2">
                        <span>
                          {dossier.identity.anomalies.map((a) => ANOMALY_LABELS[a][locale]).join(t.listSeparator)}
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
                      {t.inspectPassport}
                    </button>

                    {passportInspected ? (
                      dossier.identity.inspection.length === 0 ? (
                        <p class="text-sm opacity-60">{t.findingNone}</p>
                      ) : (
                        <ul class="list">
                          {dossier.identity.inspection.map((o) => (
                            <li class="list-row px-0 py-1 text-warning" key={o}>
                              {t.findingPrefix}: {FORGERY_LABELS[o][locale]}
                            </li>
                          ))}
                        </ul>
                      )
                    ) : null}
                  </>
                ) : null}

                {centerTab === 'boarding_pass' ? (
                  <div>
                    <Row label={t.fieldFlight}>{dossier.boardingPass.flightNo}</Row>
                    <Row label={t.fieldDestination}>{dossier.boardingPass.destination}</Row>
                    <Row label={t.fieldSeat}>{dossier.boardingPass.seat}</Row>
                    <Row label={t.fieldTripType}>{TRIP_TYPE_LABELS[dossier.boardingPass.tripType][locale]}</Row>
                    <Row label={t.fieldPayment}>{PAYMENT_LABELS[dossier.boardingPass.payment][locale]}</Row>
                    <Row label={t.fieldPurchased}>
                      {t.purchasedDaysBefore(dossier.boardingPass.purchasedDaysBefore)}
                    </Row>
                    <Row label={t.fieldCheckedBags}>{t.bagCount(dossier.boardingPass.checkedBags)}</Row>
                  </div>
                ) : null}

                {centerTab === 'belongings' ? (
                  <ul class="flex flex-col gap-2">
                    {dossier.belongings.map((item) => (
                      <li class="flex flex-wrap items-center gap-2" key={item.kind}>
                        <span>
                          {ITEM_LABELS[item.kind]?.[locale] ?? item.kind} × {item.quantity}
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
                            {FLAG_LABELS[flag][locale]}
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
                    {t.tabInterview}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class={`tab ${rightTab === 'mouth' ? 'tab-active' : ''}`}
                    onClick={() => openRight('mouth')}
                  >
                    {t.tabMouth}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class={`tab ${rightTab === 'xray' ? 'tab-active' : ''}`}
                    onClick={() => openRight('xray')}
                  >
                    {t.tabXray}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class={`tab ${rightTab === 'record' ? 'tab-active' : ''}`}
                    onClick={() => openRight('record')}
                  >
                    {t.tabRecord}
                  </button>
                </div>

                {rightTab === 'interview' ? (
                  <InterviewPanel
                    exchanges={dossier.interview}
                    asked={asked}
                    portrait={passengerImage(
                      dossier.appearance.archetype,
                      dossier.appearance.demeanor,
                    )}
                    followUpUnlocked={followUpUnlocked}
                    onAsk={ask}
                    locale={locale}
                  />
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
                      {t.openMouth}
                    </button>
                    {mouthChecked ? (
                      <p
                        class={
                          dossier.mouth.finding === 'clear' ? 'opacity-60' : 'font-bold text-warning'
                        }
                      >
                        {t.findingPrefix}: {MOUTH_LABELS[dossier.mouth.finding][locale]}
                      </p>
                    ) : null}
                  </>
                ) : null}

                {rightTab === 'xray' ? (
                  <XrayPanel
                    finding={bodyScan}
                    usedOn={xrayUsedOn}
                    scanning={scanning}
                    onScan={runXray}
                    onReopen={() => setScanOpen(true)}
                    locale={locale}
                  />
                ) : null}

                {rightTab === 'record' ? (
                  <>
                    <div>
                      <Row label={t.fieldCriminal}>{CRIMINAL_LABELS[dossier.record.criminalHistory][locale]}</Row>
                      <Row label={t.fieldWatchlist}>
                        <span class={dossier.record.watchlistHit ? 'font-bold text-error' : ''}>
                          {dossier.record.watchlistHit ? t.watchlistHit : t.watchlistClear}
                        </span>
                      </Row>
                      <Row label={t.fieldTrips}>{t.tripsLastYear(dossier.record.tripsLastYear)}</Row>
                      <Row label={t.fieldPurpose}>
                        {t.purposeSummary(
                          PURPOSE_LABELS[dossier.purpose.stated][locale],
                          dossier.purpose.stayDays,
                          dossier.purpose.companions,
                        )}
                      </Row>
                    </div>

                    <h3 class="text-xs tracking-widest opacity-60">{t.residenceHistory}</h3>
                    <ul class="flex flex-col gap-1.5">
                      {dossier.residenceHistory.map((entry) => (
                        <li class="flex items-center gap-2" key={entry.country}>
                          <span>
                            {t.residenceEntry(
                              COUNTRY_LABELS[entry.country]?.[locale] ?? entry.country,
                              entry.years,
                            )}
                          </span>
                          <span
                            class={`badge badge-sm ${
                              entry.stability === 'conflict' ? 'badge-error' : 'badge-ghost'
                            }`}
                          >
                            {STABILITY_LABELS[entry.stability][locale]}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      onClick={() => mark('residence')}
                    >
                      {t.checkedResidence}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap items-end gap-4 rounded-box border border-base-300 bg-base-200 p-4">
            <label class="grow">
              <span class="text-sm opacity-70">
                {t.confidence} <span class="font-bold tabular-nums">{Math.round(confidence * 100)}%</span>
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
                {t.detainKey}
              </button>
              <button
                type="button"
                class="btn btn-success btn-lg"
                disabled={submitting}
                onClick={() => submit('pass')}
              >
                {t.passKey}
              </button>
            </div>
          </div>
        </>
      ) : (
        <RevealCard
          reveal={reveal}
          totals={totals}
          index={index}
          onNext={next}
          locale={locale}
        />
      )}

      <XrayDialog
        open={scanOpen}
        portrait={passengerImage(dossier.appearance.archetype, dossier.appearance.demeanor)}
        scanning={scanning}
        finding={bodyScan}
        onClose={() => setScanOpen(false)}
        locale={locale}
      />
    </>
  );
}

function RevealCard({
  reveal,
  totals,
  index,
  onNext,
  locale,
}: {
  locale: Locale;
  reveal: Reveal;
  totals: Totals;
  index: number;
  onNext: () => void;
}) {
  const t = ui(locale);
  const jev = reveal.jev;

  return (
    <div class="flex flex-col gap-4">
      <p
        class={`text-center text-xl font-bold tracking-widest ${
          reveal.truth.isThreat ? 'text-error' : 'text-success'
        }`}
      >
        {t.truthPrefix}: {reveal.truth.isThreat ? t.truthThreat : t.truthBenign}
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="card border border-base-300 bg-base-200">
          <div class="card-body">
            <h2 class="card-title text-base">
              {t.you}
              <span class="text-sm font-normal opacity-60">
                ({formatDuration(reveal.human.elapsedMs, locale)})
              </span>
            </h2>
            <p>
              {reveal.human.verdict === 'detain' ? t.detain : t.pass}{t.midDot}{t.confidenceSuffix}{' '}
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
              <span class="text-sm font-normal opacity-60">({formatDuration(jev.latencyMs, locale)})</span>
            </h2>
            {jev.decision.kind === 'decided' ? (
              <>
                <p>
                  {jev.decision.verdict === 'detain' ? t.detain : t.pass}{t.midDot}{t.confidenceSuffix}{' '}
                  {Math.round(jev.decision.verdictConfidence * 100)}%
                </p>
                <p class="text-sm opacity-60">
                  {t.jevThreatEstimate} {jev.decision.threatProbability.toFixed(2)}
                </p>
                <p
                  class={`text-3xl font-bold tabular-nums ${
                    jev.points >= 0 ? 'text-success' : 'text-error'
                  }`}
                >
                  {jev.points >= 0 ? '+' : ''}
                  {jev.points}
                </p>

                <h3 class="mt-2 text-xs tracking-widest opacity-60">{t.jevFocus}</h3>
                {Object.entries(jev.decision.aspects).map(([id, value]) => (
                  <div class="grid grid-cols-[4rem_1fr_2.5rem] items-center gap-2 text-sm" key={id}>
                    <span class="opacity-70">
                      {ASPECT_LABELS[id as keyof typeof ASPECT_LABELS][locale]}
                    </span>
                    <progress class="progress progress-primary" value={value} max={1} />
                    <span class="text-right tabular-nums">{value.toFixed(2)}</span>
                  </div>
                ))}
              </>
            ) : (
              <p class="opacity-60">{t.lineError}</p>
            )}
          </div>
        </div>
      </div>

      {reveal.missedByHuman.length > 0 ? (
        <div role="alert" class="alert alert-warning alert-soft">
          <span>
            {t.missedByYou}:{' '}
            {reveal.missedByHuman.map((item) => INSPECTED_LABELS[item][locale]).join(t.listSeparator)}
          </span>
        </div>
      ) : null}

      <div class="navbar min-h-0 rounded-box border border-base-300 bg-base-200 px-4 py-2">
        <div class="flex flex-1 flex-wrap gap-4">
          <span class="tabular-nums">
            {t.totalHuman} <span class="font-bold">{totals.human}</span>
          </span>
          <span class="tabular-nums">
            Jev <span class="font-bold">{totals.jev}</span>
          </span>
        </div>
        <button type="button" class="btn btn-primary" onClick={onNext}>
          {index + 1 < PASSENGERS_PER_SHIFT ? t.nextPassenger : t.seeResult}
        </button>
      </div>
    </div>
  );
}
