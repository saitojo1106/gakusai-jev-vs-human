import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = resolve(root, 'apps/site/app/adapters/__fixtures__/jev-response.json');

const readKey = () => {
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  try {
    const vars = readFileSync(resolve(root, 'apps/site/.dev.vars'), 'utf8');
    const line = vars.split('\n').find((l) => l.startsWith('AI_GATEWAY_API_KEY='));
    return line?.slice('AI_GATEWAY_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
  } catch {
    return undefined;
  }
};

const state = {
  today: '2026-09-20',
  appearance: {
    ageBand: '40s',
    look: 'craftsman_30s',
    demeanor: 'sweating',
    notableItems: ['tool_bag'],
  },
  identityDocument: {
    kind: 'passport',
    fullName: 'Aren Corvell',
    nationality: 'BRG',
    nationalityStability: 'unstable',
    birthDate: '1986-01-15',
    expiresOn: '2024-03-11',
    daysUntilExpiry: -923,
    photoMatch: 'unsure',
    flaggedAnomalies: ['expired'],
    forgeryObservations: ['hologram_dim', 'mrz_checksum_fail'],
  },
  boardingPass: {
    flightNumber: 'JV412',
    destination: 'ヴェルデニア国際',
    seat: '31C',
    tripType: 'one_way',
    payment: 'cash',
    purchasedDaysBeforeDeparture: 0,
    checkedBags: 0,
  },
  belongings: [
    { item: 'wrench', description: 'レンチ', quantity: 3, flags: ['tool'] },
    { item: 'duct_tape', description: 'ダクトテープ', quantity: 2, flags: ['tool'] },
    { item: 'water_bottle', description: '水筒', quantity: 1, flags: ['liquid'] },
  ],
  travelPurpose: { stated: 'tourism', stayDays: 3, companions: 0 },
  interview: [
    { topic: 'purpose', question: '今回の渡航の目的は？', answer: '観光です。3 日ほど滞在します。', tone: 'hesitant' },
    { topic: 'occupation', question: 'お仕事は何をされていますか？', answer: '配管工です。', tone: 'hesitant' },
    { topic: 'bag_contents', question: '荷物の中身を教えてください。', answer: 'レンチ、ダクトテープ、水筒が入っています。', tone: 'hesitant' },
    { topic: 'who_packed', question: '荷造りはどなたがされましたか？', answer: '知人から預かった荷物も入っています。', tone: 'defensive' },
    { topic: 'accommodation', question: '滞在先はどちらですか？', answer: 'ヴェルデニア国際に着いてから決めます。', tone: 'hesitant' },
    { topic: 'follow_up', question: '荷造りはご自身でと伺いましたが、預かった荷物があるのは？', answer: '……中身までは確認していません。頼まれただけです。', tone: 'defensive' },
  ],
  mouthInspection: 'refused',
  backgroundCheck: { criminalHistory: 'minor', watchlistHit: true, tripsLastYear: 0 },
  residenceHistory: [
    { country: 'ZEN', years: 6, stability: 'conflict' },
    { country: 'BRG', years: 12, stability: 'unstable' },
  ],
};

const questions = {
  verdict: {
    type: 'choice',
    instructions: 'As an airport security officer, decide what to do with this passenger.',
    criteria: {
      pass: 'No meaningful hijack risk. Let them board.',
      detain: 'Signs suggest a hijack threat. Hold for secondary screening.',
    },
  },
  threat: { type: 'boolean', instructions: 'Is this passenger planning to hijack the aircraft?' },
  suspicion: {
    type: 'score',
    instructions: 'Rate the overall suspicion level.',
    criteria: ['none', 'low', 'medium', 'high', 'critical'],
  },
  documents: { type: 'boolean', instructions: 'Are the identity documents forged, expired, or inconsistent?' },
  belongings: { type: 'boolean', instructions: 'Do the belongings conflict with the stated purpose or pose a risk?' },
  interview: { type: 'boolean', instructions: 'Are the answers in the interview inconsistent or evasive?' },
  body: { type: 'boolean', instructions: 'Do demeanor or the physical inspection suggest concealment?' },
  background: { type: 'boolean', instructions: 'Do the criminal record or residence history raise the risk?' },
};

const apiKey = readKey();
if (!apiKey) {
  console.error('AI_GATEWAY_API_KEY がありません。');
  console.error('apps/site/.dev.vars に AI_GATEWAY_API_KEY=... を書くか、環境変数で渡してください。');
  process.exit(1);
}

const endpoint = process.env.JEV_ENDPOINT ?? 'https://ai-gateway.vercel.sh/v1/evaluate';
const model = process.env.JEV_MODEL ?? 'typesafe-ai/jev';

const startedAt = Date.now();
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model,
    state,
    questions,
    providerOptions: { gateway: { zeroDataRetention: true } },
  }),
});
const elapsedMs = Date.now() - startedAt;
const text = await response.text();

console.log(`POST ${endpoint}`);
console.log(`status ${response.status} ${response.statusText}  (${elapsedMs}ms)`);
console.log('---');
console.log(text);

if (response.ok) {
  mkdirSync(dirname(fixturePath), { recursive: true });
  try {
    writeFileSync(fixturePath, `${JSON.stringify(JSON.parse(text), null, 2)}\n`);
    console.log('---');
    console.log(`フィクスチャを保存しました: ${fixturePath}`);
    console.log('この中身を Claude に伝えれば、Zod スキーマを実応答に合わせます。');
  } catch {
    console.error('JSON として読めませんでした。');
  }
} else {
  process.exitCode = 1;
}
