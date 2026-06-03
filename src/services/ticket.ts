import {
  type TextChannel,
  type Message,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import { config } from "../config";
import { logger } from "../utils/logger";
import { type AIResponse, analyzeTicket, generateFollowUp } from "./openai";
import { type ModerationRecord, saveModerationLog } from "./moderation";

/** チケットチャンネルごとの状態管理 */
interface TicketState {
  /** 初期対応済みかどうか */
  initialResponseSent: boolean;
  /** 運営に引き継ぎ済みか */
  escalated: boolean;
  /** 会話履歴 */
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  /** 初期メッセージ受信のタイマーID */
  pendingTimer: ReturnType<typeof setTimeout> | null;
  /** バッファリング中のメッセージ */
  pendingMessages: PendingMessage[];
}

interface PendingMessage {
  content: string;
  userId: string;
  userTag: string;
  guildId: string;
}

const ticketStates = new Map<string, TicketState>();

interface ChannelLike {
  type: ChannelType;
  parentId?: string | null;
  name?: string | null;
}

export function isTicketChannel(channel: ChannelLike): boolean {
  if (channel.type !== ChannelType.GuildText) return false;

  const matchesCategory =
    config.ticket.categoryIds.length === 0 ||
    (channel.parentId != null && config.ticket.categoryIds.includes(channel.parentId));

  const matchesPrefix =
    config.ticket.channelPrefixes.length === 0 ||
    config.ticket.channelPrefixes.some((prefix) => (channel.name ?? "").startsWith(prefix));

  return matchesCategory && matchesPrefix;
}

export function getTicketState(channelId: string): TicketState {
  let state = ticketStates.get(channelId);
  if (!state) {
    state = {
      initialResponseSent: false,
      escalated: false,
      conversationHistory: [],
      pendingTimer: null,
      pendingMessages: [],
    };
    ticketStates.set(channelId, state);
  }
  return state;
}

export function cleanupTicketState(channelId: string): void {
  const state = ticketStates.get(channelId);
  if (state?.pendingTimer) {
    clearTimeout(state.pendingTimer);
  }
  ticketStates.delete(channelId);
  logger.info(`チケット状態をクリーンアップしました: ${channelId}`);
}

function buildResponseEmbed(aiResponse: AIResponse, isEscalation: boolean): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setDescription(aiResponse.reply)
    .setTimestamp()
    .setFooter({ text: "AI自動応答システム" });

  if (isEscalation) {
    embed.setColor(0xff6b35).setTitle("🎫 お問い合わせを受け付けました");
  } else {
    embed.setColor(0x5865f2).setTitle("💬 AIサポート");
  }

  return embed;
}

function buildEscalationEmbed(aiResponse: AIResponse, ticketChannelId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xff6b35)
    .setTitle("🔔 運営対応リクエスト")
    .addFields(
      { name: "カテゴリ", value: aiResponse.category, inline: true },
      { name: "確信度", value: `${Math.round(aiResponse.confidence * 100)}%`, inline: true },
      { name: "概要", value: aiResponse.summary || "（概要なし）" },
      { name: "チケットチャンネル", value: `<#${ticketChannelId}>` },
    )
    .setTimestamp();
}

export async function handleTicketMessage(message: Message): Promise<void> {
  const channel = message.channel as TextChannel;
  const state = getTicketState(channel.id);

  if (state.pendingMessages.length >= 10) {
    logger.warn(`チケット ${channel.id} のバッファが上限に達しました`);
    return;
  }

  state.pendingMessages.push({
    content: message.content,
    userId: message.author.id,
    userTag: message.author.tag,
    guildId: message.guildId ?? "",
  });

  if (state.pendingTimer) {
    clearTimeout(state.pendingTimer);
  }

  const delay = state.initialResponseSent ? 5 : config.ai.responseDelaySeconds;

  state.pendingTimer = setTimeout(async () => {
    await processBufferedMessages(channel, state);
  }, delay * 1000);

  logger.debug(
    `メッセージをバッファリングしました (チケット: ${channel.name}, ${delay}秒後に処理)`,
  );
}

async function processBufferedMessages(
  channel: TextChannel,
  state: TicketState,
): Promise<void> {
  const buffered = state.pendingMessages;
  const combinedMessage = buffered.map((m) => m.content).join("\n");
  const lastMsg = buffered[buffered.length - 1];
  state.pendingMessages = [];
  state.pendingTimer = null;

  if (!combinedMessage.trim()) return;

  try {
    await channel.sendTyping();

    let aiResponse: AIResponse;

    if (!state.initialResponseSent) {
      aiResponse = await analyzeTicket(combinedMessage);
      state.initialResponseSent = true;
    } else {
      aiResponse = await generateFollowUp(state.conversationHistory, combinedMessage);
    }

    state.conversationHistory.push({ role: "user", content: combinedMessage });
    state.conversationHistory.push({ role: "assistant", content: aiResponse.reply });

    if (state.conversationHistory.length > config.ai.maxHistoryMessages * 2) {
      state.conversationHistory = state.conversationHistory.slice(-config.ai.maxHistoryMessages * 2);
    }

    const embed = buildResponseEmbed(aiResponse, aiResponse.needs_staff);
    await channel.send({ embeds: [embed] });

    if (aiResponse.needs_staff && !state.escalated) {
      await escalateToStaff(channel, aiResponse);
      state.escalated = true;
    }

    if (aiResponse.moderation_flagged && lastMsg) {
      await handleModerationFlag(channel, aiResponse, combinedMessage, lastMsg);
    }

    logger.info(
      `チケット ${channel.name} に応答しました (category: ${aiResponse.category}, needs_staff: ${aiResponse.needs_staff}, moderation_flagged: ${aiResponse.moderation_flagged})`,
    );
  } catch (error) {
    logger.error(`チケット ${channel.name} の処理中にエラーが発生しました:`, error);
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("⚠️ エラー")
          .setDescription(
            "申し訳ございません。処理中にエラーが発生しました。運営スタッフが確認いたします。",
          ),
      ],
    });

    if (config.staff.roleId) {
      await channel.send(`<@&${config.staff.roleId}> AI処理エラーが発生しました。手動での対応をお願いします。`);
    }
  }
}

async function escalateToStaff(
  ticketChannel: TextChannel,
  aiResponse: AIResponse,
): Promise<void> {
  if (config.staff.roleId) {
    await ticketChannel.send(
      `<@&${config.staff.roleId}>\n運営スタッフへの引き継ぎが必要と判断されました。確認をお願いいたします。`,
    );
  }

  if (config.staff.escalationLogChannelId) {
    const guild = ticketChannel.guild;
    const logChannel = guild.channels.cache.get(config.staff.escalationLogChannelId) as
      | TextChannel
      | undefined;

    if (logChannel) {
      const embed = buildEscalationEmbed(aiResponse, ticketChannel.id);
      await logChannel.send({ embeds: [embed] });
      logger.info(`エスカレーションログを送信しました: ${config.staff.escalationLogChannelId}`);
    } else {
      logger.warn(`エスカレーションログチャンネルが見つかりません: ${config.staff.escalationLogChannelId}`);
    }
  }
}

function buildModerationEmbed(
  aiResponse: AIResponse,
  channelId: string,
  userId: string,
): EmbedBuilder {
  const severityColors: Record<string, number> = {
    low: 0xfee75c,
    medium: 0xf97316,
    high: 0xed4245,
  };
  const color = severityColors[aiResponse.moderation_severity] ?? 0xed4245;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle("⚠️ モラル違反検知")
    .addFields(
      { name: "違反種別", value: aiResponse.moderation_type || "不明", inline: true },
      { name: "重大度", value: aiResponse.moderation_severity || "不明", inline: true },
      { name: "ユーザー", value: `<@${userId}>`, inline: true },
      { name: "チケットチャンネル", value: `<#${channelId}>` },
      { name: "詳細", value: aiResponse.moderation_detail || "（詳細なし）" },
    )
    .setTimestamp();
}

async function handleModerationFlag(
  channel: TextChannel,
  aiResponse: AIResponse,
  messageContent: string,
  lastMsg: PendingMessage,
): Promise<void> {
  const record: ModerationRecord = {
    timestamp: new Date().toISOString(),
    guildId: lastMsg.guildId,
    channelId: channel.id,
    channelName: channel.name,
    userId: lastMsg.userId,
    userTag: lastMsg.userTag,
    messageContent,
    violationType: aiResponse.moderation_type,
    severity: (aiResponse.moderation_severity as "low" | "medium" | "high") || "low",
    aiSummary: aiResponse.moderation_detail,
  };

  saveModerationLog(record);

  const logChannelId = config.moderation.logChannelId || config.staff.escalationLogChannelId;
  if (logChannelId) {
    const logChannel = channel.guild.channels.cache.get(logChannelId) as TextChannel | undefined;
    if (logChannel) {
      const embed = buildModerationEmbed(aiResponse, channel.id, lastMsg.userId);
      await logChannel.send({ embeds: [embed] });
      logger.info(`モデレーション通知を送信しました: ${logChannelId}`);
    }
  }

  if (config.staff.roleId && aiResponse.moderation_severity === "high") {
    await channel.send(
      `<@&${config.staff.roleId}>\n重大なモラル違反が検知されました。速やかな確認をお願いいたします。`,
    );
  }

  logger.warn(
    `モラル違反検知: channel=${channel.name}, user=${lastMsg.userTag}, type=${aiResponse.moderation_type}, severity=${aiResponse.moderation_severity}`,
  );
}
