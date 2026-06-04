import OpenAI from "openai";
import { config } from "../config";
import { logger } from "../utils/logger";

const client = new OpenAI({ apiKey: config.openai.apiKey });

export interface AIResponse {
  reply: string;
  needs_staff: boolean;
  category: string;
  summary: string;
  confidence: number;
  moderation_flagged: boolean;
  moderation_type: string;
  moderation_severity: "low" | "medium" | "high" | "";
  moderation_detail: string;
  off_topic: boolean;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export async function analyzeTicket(
  userMessage: string,
  conversationHistory: ConversationMessage[] = [],
): Promise<AIResponse> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: config.ai.systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  try {
    const completion = await client.chat.completions.create({
      model: config.openai.model,
      messages,
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI APIからの応答が空です");
    }

    const parsed: AIResponse = JSON.parse(content);

    if (!parsed.reply || typeof parsed.needs_staff !== "boolean") {
      throw new Error("OpenAI応答の形式が不正です");
    }

    parsed.category = parsed.category || "other";
    parsed.summary = parsed.summary || "";
    parsed.confidence = parsed.confidence ?? 0.5;
    parsed.moderation_flagged = parsed.moderation_flagged ?? false;
    parsed.moderation_type = parsed.moderation_type || "";
    parsed.moderation_severity = parsed.moderation_severity || "";
    parsed.moderation_detail = parsed.moderation_detail || "";
    parsed.off_topic = parsed.off_topic ?? false;

    logger.info(
      `AI分析完了: category=${parsed.category}, needs_staff=${parsed.needs_staff}, confidence=${parsed.confidence}, moderation_flagged=${parsed.moderation_flagged}, off_topic=${parsed.off_topic}`,
    );

    return parsed;
  } catch (error) {
    logger.error("OpenAI API呼び出しに失敗しました:", error);

    return {
      reply:
        "申し訳ございません。現在AIによる自動応答に問題が発生しています。運営スタッフが確認いたしますので、少々お待ちください。",
      needs_staff: true,
      category: "error",
      summary: "AI応答エラー — 手動対応が必要",
      confidence: 0,
      moderation_flagged: false,
      moderation_type: "",
      moderation_severity: "",
      moderation_detail: "",
      off_topic: false,
    };
  }
}

export async function generateFollowUp(
  conversationHistory: ConversationMessage[],
  latestMessage: string,
): Promise<AIResponse> {
  return analyzeTicket(latestMessage, conversationHistory);
}
