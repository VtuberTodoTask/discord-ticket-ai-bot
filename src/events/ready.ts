import type { Client } from "discord.js";
import { logger } from "../utils/logger";

export function handleReady(client: Client<true>): void {
  logger.info(`ログインしました: ${client.user.tag}`);
  logger.info(`サーバー数: ${client.guilds.cache.size}`);

  client.user.setPresence({
    activities: [{ name: "チケット対応中", type: 3 }],
    status: "online",
  });
}
