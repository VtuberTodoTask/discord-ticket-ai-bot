# Discord Ticket AI Bot

Discord の [Ticket Tool](https://tickettool.xyz/) で作成されたチケットに対して、OpenAI を使った AI が初期対応を自動で行う Bot です。  
FiveM サーバー向けの Discord 運営を想定していますが、用途は限定されません。

## 機能

- **AI 自動初期対応** — チケット内のメッセージを OpenAI (GPT-4o-mini) で分析し、適切な初期対応メッセージを自動送信
- **運営エスカレーション** — BAN 解除申請やプレイヤートラブル等、AI だけでは対応できない案件は運営ロールをメンションして引き継ぎ
- **会話継続** — 初期対応後もユーザーの追加質問に AI が応答（会話履歴を保持）
- **メッセージバッファリング** — ユーザーが連続投稿しても、一定時間待ってからまとめて処理
- **カテゴリ分類** — 問い合わせ内容を自動分類（FAQ・バグ報告・BAN 申請 等）
- **エスカレーションログ** — 運営引き継ぎ時に専用チャンネルへログを送信（任意設定）

## 動作フロー

```
ユーザーがTicket Toolでチケット作成
  ↓
チケットチャンネルにメッセージを投稿
  ↓
Bot がメッセージを検知（カテゴリID or チャンネル名プレフィックスで判定）
  ↓
一定時間待機（連続メッセージのバッファリング）
  ↓
OpenAI でメッセージを分析
  ↓
┌─ AI が回答可能 → 自動応答して完結
└─ 運営対応が必要 → 初期対応 + 運営ロールにメンション
```

## セットアップ

### 前提条件

- Node.js 18 以上
- Discord Bot Token（[Discord Developer Portal](https://discord.com/developers/applications) で作成）
- OpenAI API Key（[OpenAI Platform](https://platform.openai.com/api-keys) で発行）

### 1. Discord Bot の作成

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」→ 名前を入力して作成
3. 左メニュー「Bot」→ 「Add Bot」
4. **Privileged Gateway Intents** で以下を有効化:
   - `MESSAGE CONTENT INTENT` ✅
   - `SERVER MEMBERS INTENT` ✅（任意）
5. 「Reset Token」で Bot Token を取得
6. 左メニュー「OAuth2」→「URL Generator」で Bot を招待:
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Read Message History`, `Embed Links`, `View Channels`

### 2. インストール

```bash
git clone https://github.com/VtuberTodoTask/discord-ticket-ai-bot.git
cd discord-ticket-ai-bot
npm install
```

### 3. 環境設定

```bash
cp .env.example .env
```

`.env` ファイルを編集して必要な値を設定：

| 環境変数 | 必須 | 説明 |
|---------|------|------|
| `DISCORD_TOKEN` | ✅ | Discord Bot のトークン |
| `OPENAI_API_KEY` | ✅ | OpenAI の API キー |
| `GUILD_ID` | | 対象サーバーの ID（空で全サーバー対応） |
| `OPENAI_MODEL` | | 使用モデル（デフォルト: `gpt-4o-mini`） |
| `TICKET_CATEGORY_IDS` | | チケットカテゴリの ID（カンマ区切り） |
| `TICKET_CHANNEL_PREFIXES` | | チケットチャンネル名のプレフィックス（デフォルト: `ticket-`） |
| `TICKET_TOOL_BOT_ID` | | Ticket Tool の Bot ID |
| `STAFF_ROLE_ID` | | 運営ロールの ID（エスカレーション用） |
| `ESCALATION_LOG_CHANNEL_ID` | | エスカレーションログ送信先チャンネル ID |
| `AI_RESPONSE_DELAY_SECONDS` | | メッセージバッファリング待機秒数（デフォルト: `10`） |
| `AI_MAX_HISTORY_MESSAGES` | | 会話履歴の最大メッセージ数（デフォルト: `20`） |

### 4. AI プロンプトのカスタマイズ

`config/system_prompt.txt` を編集して、サーバー固有のルールや FAQ を追記できます。

### 5. ダッシュボードのセットアップ

```bash
cd dashboard
npm install
cd ..
```

### 6. 起動

```bash
# 開発モード（Bot + APIサーバーのみ）
npm run dev

# 開発モード（ダッシュボードUIの開発サーバー、別ターミナルで）
npm run dev:dashboard

# 本番モード（ダッシュボードをビルドしてAPIサーバーから配信）
npm run build
npm start
# → http://localhost:3000/login でダッシュボードにアクセス
```

> **注意**: `npm run dev` は Bot + API サーバーのみ起動します。ダッシュボード UI を利用するには、本番モードで `npm run build` を実行してからAPIサーバーを起動するか、開発モードでは別ターミナルで `npm run dev:dashboard` を実行してください。

### Docker で起動

```bash
docker build -t discord-ticket-ai-bot .
docker run -d --env-file .env --name ticket-bot discord-ticket-ai-bot
```

## チケットチャンネルの検知ルール

Bot は以下の条件でチケットチャンネルを判定します：

1. **カテゴリ ID** — `TICKET_CATEGORY_IDS` に指定したカテゴリ配下のチャンネル
2. **チャンネル名プレフィックス** — `TICKET_CHANNEL_PREFIXES` で始まるチャンネル名

両方設定した場合は **AND 条件** で判定されます。  
カテゴリ ID を空にした場合はプレフィックスのみで判定します。

## プロジェクト構成

```
discord-ticket-ai-bot/
├── src/
│   ├── index.ts              # エントリーポイント
│   ├── config.ts             # 設定読み込み
│   ├── events/               # Discord イベントハンドラ
│   │   ├── ready.ts
│   │   ├── messageCreate.ts
│   │   ├── channelCreate.ts
│   │   └── channelDelete.ts
│   ├── services/
│   │   ├── openai.ts         # OpenAI API クライアント
│   │   └── ticket.ts         # チケット検知・管理
│   └── utils/
│       └── logger.ts         # ロガー
├── config/
│   └── system_prompt.txt     # AI システムプロンプト
├── .env.example
├── Dockerfile
├── package.json
└── tsconfig.json
```

## ライセンス

MIT
