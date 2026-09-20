import { DEFAULT_LOCALE, isLocale, localeFromAcceptLanguage } from '@game/domain';
import type { Locale } from '@game/domain';

export const LOCALE_COOKIE = 'lang';
export const LOCALE_QUERY = 'lang';

const cookieValue = (header: string | undefined, name: string): string | undefined => {
  if (header === undefined) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
};

export interface LocaleRequest {
  readonly query: string | undefined;
  readonly cookie: string | undefined;
  readonly acceptLanguage: string | undefined;
}

/** ?lang → Cookie → Accept-Language → 既定 の順で決める。 */
export const resolveLocale = (request: LocaleRequest): Locale => {
  if (isLocale(request.query)) return request.query;
  const fromCookie = cookieValue(request.cookie, LOCALE_COOKIE);
  if (isLocale(fromCookie)) return fromCookie;
  return localeFromAcceptLanguage(request.acceptLanguage) ?? DEFAULT_LOCALE;
};

/** 現在のパスのまま言語だけ差し替えた URL。 */
export const localeHref = (url: string, locale: Locale): string => {
  const next = new URL(url);
  next.searchParams.set(LOCALE_QUERY, locale);
  return `${next.pathname}${next.search}`;
};

export interface Ui {
  readonly siteTitle: string;
  readonly siteDescription: string;
  readonly opponent: string;
  readonly backToTitle: string;
  readonly seeRanking: string;

  readonly startLead: string;
  readonly startRules: string;
  readonly airportPlaceholder: string;
  readonly airportTooLong: string;
  readonly airportRequired: string;
  readonly judging: string;
  readonly startShift: string;

  readonly sortingTitle: string;
  readonly lanePass: string;
  readonly laneDetain: string;
  readonly sealed: string;
  readonly sealedCard: string;
  readonly skip: string;
  readonly takeYourPost: string;
  readonly waitNoMore: string;
  readonly preparingTitle: string;
  readonly preparingCheckpoint: string;
  readonly jevSealed: string;

  readonly shiftNotFound: string;
  readonly callingPassenger: string;
  readonly newsflash: string;
  readonly passengerCounter: (index: number, total: number) => string;
  readonly elapsed: string;
  readonly human: string;
  readonly you: string;
  readonly demeanor: string;
  readonly notableItems: string;
  readonly listSeparator: string;
  readonly midDot: string;
  readonly quote: (text: string) => string;

  readonly tabIdentity: string;
  readonly tabBoardingPass: string;
  readonly tabBelongings: string;
  readonly tabInterview: string;
  readonly tabMouth: string;
  readonly tabXray: string;
  readonly tabRecord: string;

  readonly fieldKind: string;
  readonly fieldName: string;
  readonly fieldNationality: string;
  readonly fieldBirthDate: string;
  readonly fieldExpiry: string;
  readonly fieldPhotoMatch: string;
  readonly inspectPassport: string;
  readonly findingNone: string;
  readonly findingPrefix: string;
  readonly fieldFlight: string;
  readonly fieldDestination: string;
  readonly fieldSeat: string;
  readonly fieldTripType: string;
  readonly fieldPayment: string;
  readonly fieldPurchased: string;
  readonly purchasedDaysBefore: (days: number) => string;
  readonly fieldCheckedBags: string;
  readonly bagCount: (n: number) => string;

  readonly openMouth: string;
  readonly fieldCriminal: string;
  readonly fieldWatchlist: string;
  readonly watchlistHit: string;
  readonly watchlistClear: string;
  readonly fieldTrips: string;
  readonly tripsLastYear: (n: number) => string;
  readonly fieldPurpose: string;
  readonly purposeSummary: (purpose: string, days: number, companions: number) => string;
  readonly residenceHistory: string;
  readonly residenceEntry: (country: string, years: number) => string;
  readonly checkedResidence: string;

  readonly askPrompt: string;
  readonly nothingLeftToAsk: string;
  readonly followUp: string;
  readonly followUpLocked: (n: number) => string;
  readonly officerInitial: string;

  readonly xrayOnce: string;
  readonly xrayUse: string;
  readonly xrayScanning: string;
  readonly xrayUsedOn: (n: number) => string;
  readonly xraySpent: string;
  readonly xrayViewScan: string;
  readonly xrayDialogTitle: string;
  readonly xrayAnalysing: string;
  readonly xrayRegion: string;
  readonly xrayDensity: string;
  readonly xrayVerdict: string;
  readonly xrayVerdictAlarm: string;
  readonly xrayVerdictQuiet: string;
  readonly close: string;

  readonly confidence: string;
  readonly detainKey: string;
  readonly passKey: string;

  readonly truthPrefix: string;
  readonly truthThreat: string;
  readonly truthThreatShort: string;
  readonly truthBenign: string;
  readonly truthBenignShort: string;
  readonly detain: string;
  readonly pass: string;
  readonly confidenceSuffix: string;
  readonly jevThreatEstimate: string;
  readonly jevFocus: string;
  readonly lineError: string;
  readonly missedByYou: string;
  readonly totalHuman: string;
  readonly nextPassenger: string;
  readonly seeResult: string;

  readonly resultNotFound: string;
  readonly resultNotFoundBody: string;
  readonly winner: string;
  readonly youWin: string;
  readonly jevWins: string;
  readonly draw: string;
  readonly shareOnX: string;
  readonly saveJson: string;
  readonly statCorrect: string;
  readonly statMissed: string;
  readonly statFalseDetain: string;
  readonly statDuration: string;
  readonly ofTotal: (correct: number, total: number, jev: number) => string;
  readonly withJev: (n: number) => string;
  readonly passengerLabel: (n: number) => string;
  readonly inspectedByYou: string;
  readonly none: string;
  readonly notInspected: string;
  readonly playAgain: string;
  readonly noDecision: string;

  readonly ranking: string;
  readonly filterByAirport: string;
  readonly filter: string;
  readonly clearFilter: string;
  readonly nobodyYet: string;
  readonly colRank: string;
  readonly colAirport: string;
  readonly colLevel: string;
  readonly colScore: string;
  readonly colMargin: string;
  readonly colDate: string;
  readonly details: string;

  readonly checkpointTitle: (n: number) => string;
  readonly resultTitle: (airport: string, level: number, title: string) => string;
  readonly resultDescription: (args: {
    human: number;
    jev: number;
    correct: number;
    total: number;
    missed: number;
    catchphrase: string;
  }) => string;
}

const ja: Ui = {
  siteTitle: '保安検査 vs Jev',
  siteDescription: '空港の保安検査官として乗客 10 人を審査し、AI 判定モデル Jev と勝負する。',
  opponent: '対戦相手: Jev（TypeSafe AI）',
  backToTitle: 'タイトルに戻る',
  seeRanking: 'ランキングを見る',

  startLead: '乗客 10 人を審査して、AI 判定モデル Jev とスコアを競う。',
  startRules: '脅威を通過させればハイジャック、無害な人を拘束すれば苦情。',
  airportPlaceholder: 'あなたの空港名',
  airportTooLong: '空港名は 20 文字までです。',
  airportRequired: '空港名を入力してください。',
  judging: 'Jev が審査中…',
  startShift: 'シフト開始',

  sortingTitle: 'Jev が仕分け中…',
  lanePass: '通過',
  laneDetain: '拘束',
  sealed: '封印済',
  sealedCard: '封印された判定',
  skip: 'スキップ',
  takeYourPost: 'あなたの番です。配置につく →',
  waitNoMore: '待たずに進む',
  preparingTitle: '配置につきます',
  preparingCheckpoint: '検査場を準備中…',
  jevSealed: 'Jev 封印済',

  shiftNotFound: 'このシフトは見つかりませんでした。',
  callingPassenger: '乗客を呼び出しています…',
  newsflash: 'ニュース速報',
  passengerCounter: (index, total) => `${index} / ${total} 人目`,
  elapsed: '経過',
  human: '人間',
  you: 'あなた',
  demeanor: '態度',
  notableItems: '目立つ持ち物',
  listSeparator: '、',
  midDot: '・',
  quote: (text) => `「${text}」`,

  tabIdentity: '身分証 (1)',
  tabBoardingPass: '搭乗券 (2)',
  tabBelongings: '手荷物 (3)',
  tabInterview: '質問 (Q)',
  tabMouth: '口内検査 (M)',
  tabXray: 'X 線 (X)',
  tabRecord: '照会 (R)',

  fieldKind: '種別',
  fieldName: '氏名',
  fieldNationality: '国籍',
  fieldBirthDate: '生年月日',
  fieldExpiry: '有効期限',
  fieldPhotoMatch: '写真一致度',
  inspectPassport: 'パスポートを精査',
  findingNone: '所見: 異常なし',
  findingPrefix: '所見',
  fieldFlight: '便名',
  fieldDestination: '行き先',
  fieldSeat: '座席',
  fieldTripType: '種別',
  fieldPayment: '購入方法',
  fieldPurchased: '購入時期',
  purchasedDaysBefore: (days) => `出発の ${days} 日前`,
  fieldCheckedBags: '預け荷物',
  bagCount: (n) => `${n} 個`,

  openMouth: '口を開けてもらう',
  fieldCriminal: '前歴',
  fieldWatchlist: '監視リスト',
  watchlistHit: '該当',
  watchlistClear: '該当なし',
  fieldTrips: '渡航回数',
  tripsLastYear: (n) => `過去 1 年で ${n} 回`,
  fieldPurpose: '渡航目的',
  purposeSummary: (purpose, days, companions) => `${purpose}・${days} 日・同行 ${companions} 名`,
  residenceHistory: '居住歴',
  residenceEntry: (country, years) => `${country}・${years} 年`,
  checkedResidence: '居住歴を確認した',

  askPrompt: '下の選択肢から質問してください',
  nothingLeftToAsk: '聞けることはもうありません。',
  followUp: '追い質問 ⚡',
  followUpLocked: (n) => `追い質問 ⚡ ${n} 問で解放`,
  officerInitial: '検',

  xrayOnce: 'X 線検査は 1 シフトに 1 回だけ。使いどころを選んでください。',
  xrayUse: 'この乗客に X 線検査を使う',
  xrayScanning: 'スキャン中…',
  xrayUsedOn: (n) => `使用済み（${n} 人目）`,
  xraySpent: 'このシフトの X 線検査はもう使えません。',
  xrayViewScan: 'スキャン画像を見る',
  xrayDialogTitle: 'X 線ボディスキャナ',
  xrayAnalysing: 'センサー走査中… 体内構造を解析しています',
  xrayRegion: '検出部位',
  xrayDensity: '推定密度',
  xrayVerdict: '判定',
  xrayVerdictAlarm: '確定・拘束対象',
  xrayVerdictQuiet: '所見なし',
  close: '閉じる',

  confidence: '確信度',
  detainKey: '← 拘束 (A)',
  passKey: '通過 (D) →',

  truthPrefix: '真実',
  truthThreat: '脅威（ハイジャック計画）',
  truthThreatShort: '脅威',
  truthBenign: '無害な乗客',
  truthBenignShort: '無害',
  detain: '拘束',
  pass: '通過',
  confidenceSuffix: '確信度',
  jevThreatEstimate: 'ハイジャック計画の見立て',
  jevFocus: '着眼点',
  lineError: '回線エラー（判定不能・0 点）',
  missedByYou: 'あなたが見なかったもの',
  totalHuman: '累計 人間',
  nextPassenger: '次の乗客 →',
  seeResult: '結果を見る →',

  resultNotFound: '結果が見つかりません',
  resultNotFoundBody: 'URL が違うか、まだ保存されていません。',
  winner: '勝敗',
  youWin: 'あなたの勝ち',
  jevWins: 'Jev の勝ち',
  draw: '引き分け',
  shareOnX: 'X でシェア',
  saveJson: 'JSON を保存',
  statCorrect: '正答',
  statMissed: '見逃し',
  statFalseDetain: '誤検知',
  statDuration: '所要時間',
  ofTotal: (correct, total, jev) => `${correct}/${total}（Jev ${jev}/${total}）`,
  withJev: (n) => `（Jev ${n}）`,
  passengerLabel: (n) => `乗客 ${n}`,
  inspectedByYou: 'あなたが調べた項目',
  none: 'なし',
  notInspected: '見なかったもの',
  playAgain: 'もう一度遊ぶ',
  noDecision: '判定不能',

  ranking: 'ランキング',
  filterByAirport: '空港名で絞り込む',
  filter: '絞り込む',
  clearFilter: '解除',
  nobodyYet: 'まだ誰も検査を終えていません。',
  colRank: '順位',
  colAirport: '空港名',
  colLevel: 'レベル',
  colScore: 'スコア',
  colMargin: 'Jev との差',
  colDate: '日時',
  details: '詳細',

  checkpointTitle: (n) => `検査場 ${n} 人目`,
  resultTitle: (airport, level, title) => `${airport} の保安検査官レベル: Lv.${level} ${title}`,
  resultDescription: ({ human, jev, correct, total, missed, catchphrase }) =>
    `あなた ${human} 点 / Jev ${jev} 点（正答 ${correct}/${total}・見逃し ${missed}）「${catchphrase}」`,
};

const en: Ui = {
  siteTitle: 'Checkpoint vs Jev',
  siteDescription:
    'Work the airport checkpoint, screen ten passengers, and go head to head with Jev, an AI judgement model.',
  opponent: 'Opponent: Jev (TypeSafe AI)',
  backToTitle: 'Back to title',
  seeRanking: 'View ranking',

  startLead: 'Screen ten passengers and race Jev, an AI judgement model, for the better score.',
  startRules: 'Let a threat through and it is a hijacking. Detain an innocent and it is a complaint.',
  airportPlaceholder: 'Name your airport',
  airportTooLong: 'Airport names are limited to 20 characters.',
  airportRequired: 'Please enter an airport name.',
  judging: 'Jev is screening…',
  startShift: 'Start shift',

  sortingTitle: 'Jev is sorting…',
  lanePass: 'PASS',
  laneDetain: 'DETAIN',
  sealed: 'SEALED',
  sealedCard: 'A sealed verdict',
  skip: 'Skip',
  takeYourPost: 'Your turn. Take your post →',
  waitNoMore: 'Go without waiting',
  preparingTitle: 'Taking your post',
  preparingCheckpoint: 'Preparing the checkpoint…',
  jevSealed: 'Jev sealed',

  shiftNotFound: 'That shift could not be found.',
  callingPassenger: 'Calling the next passenger…',
  newsflash: 'BREAKING NEWS',
  passengerCounter: (index, total) => `Passenger ${index} of ${total}`,
  elapsed: 'Elapsed',
  human: 'Human',
  you: 'You',
  demeanor: 'Demeanour',
  notableItems: 'Notable items',
  listSeparator: ', ',
  midDot: ' · ',
  quote: (text) => `"${text}"`,

  tabIdentity: 'ID (1)',
  tabBoardingPass: 'Boarding pass (2)',
  tabBelongings: 'Belongings (3)',
  tabInterview: 'Interview (Q)',
  tabMouth: 'Mouth (M)',
  tabXray: 'X-ray (X)',
  tabRecord: 'Records (R)',

  fieldKind: 'Type',
  fieldName: 'Name',
  fieldNationality: 'Nationality',
  fieldBirthDate: 'Date of birth',
  fieldExpiry: 'Expires',
  fieldPhotoMatch: 'Photo match',
  inspectPassport: 'Inspect the passport closely',
  findingNone: 'Finding: nothing unusual',
  findingPrefix: 'Finding',
  fieldFlight: 'Flight',
  fieldDestination: 'Destination',
  fieldSeat: 'Seat',
  fieldTripType: 'Trip',
  fieldPayment: 'Paid by',
  fieldPurchased: 'Booked',
  purchasedDaysBefore: (days) => `${days} days before departure`,
  fieldCheckedBags: 'Checked bags',
  bagCount: (n) => `${n}`,

  openMouth: 'Ask them to open their mouth',
  fieldCriminal: 'Criminal record',
  fieldWatchlist: 'Watchlist',
  watchlistHit: 'Hit',
  watchlistClear: 'No hit',
  fieldTrips: 'Trips',
  tripsLastYear: (n) => `${n} in the last year`,
  fieldPurpose: 'Purpose',
  purposeSummary: (purpose, days, companions) =>
    `${purpose} · ${days} days · ${companions} companion${companions === 1 ? '' : 's'}`,
  residenceHistory: 'Residence history',
  residenceEntry: (country, years) => `${country} · ${years} yrs`,
  checkedResidence: 'Checked the residence history',

  askPrompt: 'Pick a question below',
  nothingLeftToAsk: 'There is nothing left to ask.',
  followUp: 'Press them ⚡',
  followUpLocked: (n) => `Press them ⚡ unlocks after ${n}`,
  officerInitial: 'O',

  xrayOnce: 'The X-ray can be used once per shift. Choose your moment.',
  xrayUse: 'Run the X-ray on this passenger',
  xrayScanning: 'Scanning…',
  xrayUsedOn: (n) => `Already used (passenger ${n})`,
  xraySpent: 'The X-ray for this shift is spent.',
  xrayViewScan: 'View the scan',
  xrayDialogTitle: 'X-ray body scanner',
  xrayAnalysing: 'Sensor sweep in progress… analysing internal structure',
  xrayRegion: 'Region',
  xrayDensity: 'Estimated density',
  xrayVerdict: 'Verdict',
  xrayVerdictAlarm: 'Confirmed — detain',
  xrayVerdictQuiet: 'Nothing found',
  close: 'Close',

  confidence: 'Confidence',
  detainKey: '← Detain (A)',
  passKey: 'Pass (D) →',

  truthPrefix: 'Truth',
  truthThreat: 'Threat (hijacking plot)',
  truthThreatShort: 'Threat',
  truthBenign: 'Harmless passenger',
  truthBenignShort: 'Harmless',
  detain: 'Detain',
  pass: 'Pass',
  confidenceSuffix: 'confidence',
  jevThreatEstimate: 'Hijacking estimate',
  jevFocus: 'What it weighed',
  lineError: 'Connection error (no decision, 0 points)',
  missedByYou: 'What you never looked at',
  totalHuman: 'Total human',
  nextPassenger: 'Next passenger →',
  seeResult: 'See the result →',

  resultNotFound: 'Result not found',
  resultNotFoundBody: 'The URL may be wrong, or it has not been saved yet.',
  winner: 'Winner',
  youWin: 'You win',
  jevWins: 'Jev wins',
  draw: 'Draw',
  shareOnX: 'Share on X',
  saveJson: 'Save JSON',
  statCorrect: 'Correct',
  statMissed: 'Missed threats',
  statFalseDetain: 'False detains',
  statDuration: 'Time taken',
  ofTotal: (correct, total, jev) => `${correct}/${total} (Jev ${jev}/${total})`,
  withJev: (n) => `(Jev ${n})`,
  passengerLabel: (n) => `Passenger ${n}`,
  inspectedByYou: 'What you inspected',
  none: 'Nothing',
  notInspected: 'What you skipped',
  playAgain: 'Play again',
  noDecision: 'No decision',

  ranking: 'Ranking',
  filterByAirport: 'Filter by airport',
  filter: 'Filter',
  clearFilter: 'Clear',
  nobodyYet: 'Nobody has finished a shift yet.',
  colRank: '#',
  colAirport: 'Airport',
  colLevel: 'Level',
  colScore: 'Score',
  colMargin: 'vs Jev',
  colDate: 'Date',
  details: 'Details',

  checkpointTitle: (n) => `Checkpoint — passenger ${n}`,
  resultTitle: (airport, level, title) => `${airport} officer rating: Lv.${level} ${title}`,
  resultDescription: ({ human, jev, correct, total, missed, catchphrase }) =>
    `You ${human} / Jev ${jev} (correct ${correct}/${total}, missed ${missed}) "${catchphrase}"`,
};

const CATALOG: Readonly<Record<Locale, Ui>> = { ja, en };

export const ui = (locale: Locale): Ui => CATALOG[locale];
