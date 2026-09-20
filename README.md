# 保安検査ゲーム（仮） — 人間 vs Jev

空港の保安検査官として乗客 10 人を審査し、同じ 10 人を先に数秒で審査した AI 判定モデル **Jev** とスコアを競うブラウザゲーム。

- 脅威を通過させる（見逃し）= その便でハイジャック発生、−50 点。
- 無害な乗客を拘束する（誤検知）= 苦情、−10 点。
- 10 人終了後に「保安検査官レベル（Lv.1〜5）」が認定され、結果ページの URL を X でシェアできる。
- 空港名は自由入力で、そのままランキング上の名前になる。

要件定義書: [保安検査ゲーム（仮）要件定義書 — 人間 vs Jev](https://claude.ai/artifact/A3bofQaek8R42Xji7A8xSz)

## 設計上の柱

1. **情報の対等性** — 人間が調べられる情報はすべて Jev にも渡し、その逆も成り立つ。イラストは `appearance` の描画に過ぎず、追加情報を持たない。
2. **推理できるがランダム** — 真実は隠され、手がかりはノイズ混じり。確信度で勝負する。
3. **Jev はそのまま使う** — Jev の精度は調整しない。生成器のノイズ量だけを人間が面白いと感じる値に固定する。
4. **制限時間なし** — ただし所要時間は計測し、Jev の数秒と並べて見せる。
5. **ログインなし** — 1 台の PC を交代で触る前提。結果は URL で持ち帰る。
6. **RDB なし** — 乗客はシードから決定的に生成し、結果とランキングだけ Cloudflare KV に保存する。

## 技術スタック

| 領域 | 選定 |
| --- | --- |
| ランタイム | Cloudflare Workers（Static Assets 同梱） |
| フレームワーク | HonoX 0.1.x（hono/jsx レンダラ）/ Hono 4.13 |
| 永続化 | Cloudflare KV（`shift:` / `result:` / `board:top`） |
| 判定 AI | Jev（Vercel AI Gateway `POST /v1/evaluate`、Bearer 認証） |
| 型と検証 | TypeScript strict + Zod 4（境界のみ） |
| テスト | Vitest 5 + `@cloudflare/vitest-pool-workers` |
| パッケージ管理 | pnpm workspaces |

Vercel はホスティングに使わない。AI Gateway の API キー発行のためだけに使う。

## ディレクトリ構成

```
apps/
  site/                  HonoX（Cloudflare Workers）: routes / islands / adapters
packages/
  domain/                エンティティ、生成器、採点、レベル判定。外部依存ゼロ
  application/           ユースケースと Port（JudgePort, ShiftStore, ...）
  contracts/             API の Zod スキーマと型（島とサーバーで共有）
```

依存の方向は `presentation → application → domain`。Jev と KV への依存は Port に閉じ込め、テストでは Fake に差し替える。`domain` は外側を一切 import しない。

生成ロジックはサーバー側にしか置かない（島にバンドルすると Truth が推測できてしまうため）。

## セットアップ

```bash
pnpm install
```

Jev を実際に叩くには Vercel AI Gateway の API キーが要る。カード登録済みのアカウントが前提（無料クレジットを使う場合でも必要）。ローカルでは `apps/site/.dev.vars` に置く。

```
AI_GATEWAY_API_KEY=...
```

キーなしで動かす場合は `JUDGE=fake` で `FakeJudge` に差し替える。キー未設定なら自動で `FakeJudge` になるので、`pnpm --filter @game/site dev` だけで遊べる。

ゼロデータ保持（ZDR）は Vercel の Pro / Enterprise プラン専用なので既定では要求しない。Jev に送るのは生成した架空の乗客データだけで、空港名も個人情報も含まない。Pro 以上のプランで有効にしたい場合は `JEV_ZDR=true` を渡す。

`pnpm probe:jev` で `/v1/evaluate` を 1 回叩き、実応答を `apps/site/app/adapters/__fixtures__/` に保存できる。

```bash
pnpm --filter @game/site dev
```

## 開発コマンド

```bash
pnpm test           # 全パッケージのテスト
pnpm test:watch     # ウォッチ
pnpm typecheck      # 型チェック
```

KV アダプタのテストは Miniflare 上で走る（`--project site-workers`）。`@cloudflare/vitest-pool-workers` が vitest 4 系までなので、vitest は 4 に固定している。workerd が対応する最新の互換性日付に合わせて `compatibility_date` は `2026-08-22`。

## 進め方

要件定義書 §9 のテスト駆動の順で進める。

- [x] `Prng`（決定的乱数）
- [x] `generatePassenger`（決定的生成・整合性ルール）
- [x] `score` / `judgeLevel` / `summarizeShift`（採点・レベル認定）
- [x] `contracts`（Zod スキーマ）
- [x] `StartShift` / `SubmitVerdict` / `FinishShift`（Fake で）
- [x] `JevGatewayJudge`（fetch モック + 実応答フィクスチャの契約テスト）
- [x] `KvShiftStore` / `KvResultStore` / `KvLeaderboard`
- [x] HonoX の API ルート → `/r/:id` の SSR（OG タグ）→ `/ranking`
- [x] 島（`Checkpoint` と `StartShift`。`JevDemo` は `StartShift` に統合）
- [ ] 契約テスト（実 Jev への 1 回）と OG 画像の動的生成（v1.1）

## 画像アセット

画像は ChatGPT / Codex 側で生成する。ファイル名は型（`ArchetypeId`、`demeanor`、`Level`）と 1 対 1 に対応させ、`apps/site/public/` に置く。命名が一覧とずれていないかは domain のテストで検証する。

| 種別 | ファイル名 | 枚数 | 仕様 |
| --- | --- | --- | --- |
| 乗客イラスト | `img/passengers/passenger_{archetypeId}_{mood}.png` | 16 × 3（MVP は 8 × 3） | 全身・正面やや斜め・背景透過・1024×1536 |
| レベルカード | `img/levels/level_{1..5}.png` | 5 | 1200×630、右 40% を空ける（後からスコアを重ねる） |
| 背景 | `img/bg/bg_checkpoint.png` / `img/bg/bg_title.png` | 2 | 1920×1080 |
| Jev アバター | `jev_avatar_{idle,scanning,win,lose}.png` | 4 | 監視カメラ型ロボット |
| 上司 | `supervisor_{neutral,angry}.png` | 2 | 苦情演出 |
| スタンプ | `stamp_pass.png` / `stamp_detain.png` | 2 | 判定演出 |
| その他 | `seal.png` / `news_flash_frame.png` / `id_card_frame.png` / `boarding_pass_frame.png` | 4 | 文字はコードで載せる |

アーキタイプ ID と `mood`（`calm` / `nervous` / `evasive`）の一覧は [archetypes.ts](packages/domain/src/content/archetypes.ts) が正。`demeanor` は 5 種類あるが、イラストは 3 種類に丸める（`sweating`→`nervous`、`irritable`→`evasive`）。

共通スタイル: flat vector illustration, thick clean outlines, limited palette (navy / sand / signal orange), no text, transparent background.

特定の民族・宗教・国籍を「怪しく見える」方向に描かせない。怪しさは服装の不一致と態度だけで表現する。国籍と居住歴は架空国のみを使う。

書類・X 線ビュー・HUD・スコア・QR コードはコードで描くので画像は不要。1 枚 300KB 以下、合計 20MB 以内。

## Jev の実測（2026-09-20、typesafe-ai/jev）

実際に 1 シフト戦わせた結果。

| 指標 | 値 |
| --- | --- |
| 正答 | 8/10（見逃し 1・誤検知 1） |
| スコア | 96 点 |
| 所要時間 | 10 人並列で 0.66 秒（1 件あたり約 0.5 秒） |
| 費用 | 1 リクエスト $0.000063 → 1 シフト約 0.1 円 |

手がかり 3〜4 個の脅威は確実に捕まえ、2 個の脅威は取り逃がした。無害側でも手がかり 2 個の乗客を拘束していて、レッドヘリングが効いている。丁寧に調べた人間なら勝てる強さ。

**確信度の扱いを仕様書から変えた。** 要件定義書 §2 は `threat.probability` を Jev の確信度として使うとしていたが、実際の Jev は「拘束すべき 99%」と答えながら「ハイジャックを計画している確率 6%」を返す。書類偽造の兆候は濃くても、*ハイジャック*という特定の計画の確率は低い、という筋の通った推論で、実測でも脅威に対して 0.01〜0.15 の範囲にしか上がらない。これを確信度に使うと Jev のボーナスが常にゼロになるため、**`verdict.probabilities[choice]`（選んだ側に置いた確率）を確信度**に使い、人間のスライダーと同じ軸で採点している。`threat.probability` は「Jev の見立て」として結果画面に併記する。

## Jev のレート制限（重要）

**無料枠はモデル単位のレート制限がかかる。** 実測では **10 リクエスト / 約 30 秒**で、これを超えると
`429 rate_limit_exceeded` が返る。25 秒あければ 10 件が 1.1 秒で通る。

1 シフト = 10 リクエストなので、**シフトの開始が 30 秒以内に重なると片方が「判定不能」だらけになる**。
有料枠に移らない方針なので、**同時に遊べるのは 1 台、シフト開始の間隔は 30 秒以上あける**運用にする。
人間が 1 シフトに数分かけるので、1 台で回す限りは問題にならない。

`JevGatewayJudge` は 429 と 5xx を [ドキュメントの指針](https://vercel.com/docs/ai-gateway/rate-limits) どおりに投げ直す。`retry-after` があれば秒数でも HTTP 日付でもその値を尊重し、無ければ指数バックオフ。総リトライ時間は 6 秒で打ち切り、それでも駄目なら「判定不能・0 点」にしてゲームは続行する。同時実行は既定で 6 件に絞っている。

## 未決事項

要件定義書 §12 の 9 点は、返答がない前提で推奨案を採用している。

| # | 論点 | 採用 |
| --- | --- | --- |
| 1 | 難易度設定 | 不要（1 種類に固定） |
| 2 | 判定の選択肢 | 2 択（通過 / 拘束） |
| 3 | 確信度スライダー | 残す（±10 点のボーナス） |
| 4 | Jev 判定の開示 | 1 人確定するごとに開示 |
| 5 | 偽造パスポートの無害者 | ハイジャック意図だけで採点 |
| 6 | Jev に渡す `state` の言語 | 英語 |
| 7 | ランキングの重複 | 同じ空港名で何度でも載る |
| 8 | HonoX のレンダラ | hono/jsx |
| 9 | 絵のトーン | フラットベクター・コミカル寄り |

サブドメイン（例 `security.<your-domain>`）は未決。
