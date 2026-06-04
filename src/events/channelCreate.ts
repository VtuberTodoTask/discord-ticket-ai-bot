import type { NonThreadGuildBasedChannel } from "discord.js";
import { logger } from "../utils/logger";
import { isTicketChannel } from "../services/ticket";

export function handleChannelCreate(channel: NonThreadGuildBasedChannel): void {
  if (!isTicketChannel(channel)) return;

  logger.info(`新しいチケットチャンネルを検知しました: ${channel.name} (${channel.id})`);
}
