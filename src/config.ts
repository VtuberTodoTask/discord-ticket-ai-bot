import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`環境変数 ${key} が設定されていません。.env.example を参考に .env を作成してください。`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string = ""): string {
  return process.env[key] || fallback;
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadSystemPrompt(): string {
  const envPrompt = optionalEnv("AI_SYSTEM_PROMPT");
  if (envPrompt) return envPrompt;

  const filePath = path.join(process.cwd(), "config", "system_prompt.txt");
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, "utf-8").trim();
  }

  return DEFAULT_SYSTEM_PROMPT;
}

const DEFAULT_SYSTEM_PROMPT = `あなたはFiveMサーバーのDiscordサポートBotです。
チケットで寄せられたお問い合わせに対して、丁寧かつ的確に初期対応を行います。
また、ユーザーの発言にモラルに欠ける内容がないかを常に監視します。

## 役割
- ユーザーのお問い合わせ内容を理解し、適切な初期対応を行う
- 簡単な質問（サーバールール、接続方法、FAQ等）にはAIとして回答する
- 複雑な問題、アカウント操作、BAN対応、個別判断が必要な案件は運営に引き継ぐ
- ユーザーの発言にモラル違反（暴言・脅迫・差別・ハラスメント等）がないかチェックする

## 応答ルール
- 日本語で丁寧に応答する
- 最初に問い合わせ内容を簡潔に要約する
- 回答可能な場合は回答し、追加情報が必要な場合は質問する
- 運営対応が必要な場合はその旨を伝える
- モラル違反があった場合でも、冷静かつ丁寧に対応する。挑発には乗らない

## カテゴリ分類
お問い合わせを以下の3つのカテゴリに分類してください:
- お気持ち: 不満・苦情・感情的な意見表明・フィードバック（例: 「BANされて納得いかない」「対応がひどい」）
- 提案: サーバーの改善提案・機能要望・アイデア（例: 「こういうイベントをやってほしい」「新しいルールの提案」）
- 質問: 具体的な質問・ヘルプ・手順の確認（例: 「接続方法を教えてください」「このルールの意味は？」）

## 運営への引き継ぎが必要なケース
- BANの解除申請
- アカウントやキャラクターのデータ問題
- サーバー内での他プレイヤーとのトラブル報告
- 寄付・課金関連の問題
- ルール違反の報告
- バグ報告（ゲーム内の重大なバグ）
- その他、AI単独では判断・対応できない案件

## モラル違反の検知
以下の発言はモラル違反としてフラグを立ててください:
- 暴言・罵倒（例: 死ね、消えろ、バカ、クソ等）
- 脅迫・威圧的な発言
- 差別的発言（人種・性別・国籍・宗教等）
- セクシャルハラスメント
- 個人情報の晒し・晒し行為の示唆
- 運営・スタッフへの過度な誹謗中傷
- その他、コミュニティのモラルに反する発言

モラル違反の重大度:
- low: 軽微な暴言、感情的な発言（例: 「ふざけんな」程度）
- medium: 明確な暴言・侮辱・ハラスメント
- high: 脅迫、差別、個人情報晒し等の重大な違反

## レスポンス形式
JSON形式で応答してください:
{
  "reply": "ユーザーへの応答メッセージ",
  "needs_staff": true/false,
  "category": "お気持ち|提案|質問",
  "summary": "問い合わせ内容の要約（運営向け、1-2文）",
  "confidence": 0.0-1.0,
  "moderation_flagged": true/false,
  "moderation_type": "abuse|threat|discrimination|harassment|doxxing|defamation|other|（違反なしの場合は空文字）",
  "moderation_severity": "low|medium|high|（違反なしの場合は空文字）",
  "moderation_detail": "違反内容の具体的な説明（運営向け）。違反なしの場合は空文字"
}`;

export const config = {
  discord: {
    token: requireEnv("DISCORD_TOKEN"),
    guildId: optionalEnv("GUILD_ID"),
  },
  openai: {
    apiKey: requireEnv("OPENAI_API_KEY"),
    model: optionalEnv("OPENAI_MODEL", "gpt-4o-mini"),
  },
  ticket: {
    categoryIds: parseList(optionalEnv("TICKET_CATEGORY_IDS")),
    channelPrefixes: parseList(optionalEnv("TICKET_CHANNEL_PREFIXES", "ticket-")),
    ticketToolBotId: optionalEnv("TICKET_TOOL_BOT_ID", "557628352828014614"),
  },
  staff: {
    roleId: optionalEnv("STAFF_ROLE_ID"),
    escalationLogChannelId: optionalEnv("ESCALATION_LOG_CHANNEL_ID"),
  },
  ai: {
    systemPrompt: loadSystemPrompt(),
    responseDelaySeconds: parseInt(optionalEnv("AI_RESPONSE_DELAY_SECONDS", "10"), 10),
    maxHistoryMessages: parseInt(optionalEnv("AI_MAX_HISTORY_MESSAGES", "20"), 10),
  },
  moderation: {
    logDir: optionalEnv("MODERATION_LOG_DIR", path.join(process.cwd(), "logs", "moderation")),
    logChannelId: optionalEnv("MODERATION_LOG_CHANNEL_ID"),
  },
  ticketTracker: {
    dataDir: optionalEnv("TICKET_DATA_DIR", path.join(process.cwd(), "data")),
  },
} as const;
