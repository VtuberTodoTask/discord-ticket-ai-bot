import type { Message } from "discord.js";
import { config } from "../config";
import { logger } from "../utils/logger";
import { isTicketChannel, handleTicketMessage } from "../services/ticket";

export async function handleMessageCreate(message: Message): Promise<void> {
  if (message.author.bot) return;

  if (!isTicketChannel(message.channel)) return;

  if (config.discord.guildId && message.guildId !== config.discord.guildId) return;

  if (!message.content.trim()) return;

  logger.debug(
    `チケットメッセージ検知: channel=${message.channel.id}, author=${message.author.tag}`,
  );

  await handleTicketMessage(message);
}
