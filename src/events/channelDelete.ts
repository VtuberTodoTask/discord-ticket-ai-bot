import type { DMChannel, NonThreadGuildBasedChannel } from "discord.js";
import { logger } from "../utils/logger";
import { cleanupTicketState } from "../services/ticket";

export function handleChannelDelete(channel: DMChannel | NonThreadGuildBasedChannel): void {
  cleanupTicketState(channel.id);
  logger.debug(`チャンネル削除を検知、状態をクリーンアップ: ${channel.id}`);
}
