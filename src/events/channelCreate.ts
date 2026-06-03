import type { NonThreadGuildBasedChannel } from "discord.js";
import { logger } from "../utils/logger";
import { isTicketChannel, getTicketState } from "../services/ticket";

export function handleChannelCreate(channel: NonThreadGuildBasedChannel): void {
  if (!isTicketChannel(channel)) return;

  getTicketState(channel.id);

  logger.info(`新しいチケットチャンネルを検知しました: ${channel.name} (${channel.id})`);
}
