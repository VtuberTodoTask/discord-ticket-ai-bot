import { Client, GatewayIntentBits, Partials } from "discord.js";
import { config } from "./config";
import { logger } from "./utils/logger";
import { handleReady } from "./events/ready";
import { handleMessageCreate } from "./events/messageCreate";
import { handleChannelCreate } from "./events/channelCreate";
import { handleChannelDelete } from "./events/channelDelete";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once("ready", (c) => handleReady(c));
client.on("messageCreate", (message) => void handleMessageCreate(message));
client.on("channelCreate", (channel) => handleChannelCreate(channel));
client.on("channelDelete", (channel) => handleChannelDelete(channel));

client.on("error", (error) => {
  logger.error("Discordクライアントエラー:", error);
});

process.on("unhandledRejection", (error) => {
  logger.error("未処理のPromise拒否:", error);
});

process.on("SIGINT", () => {
  logger.info("シャットダウン中...");
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("シャットダウン中...");
  client.destroy();
  process.exit(0);
});

logger.info("Botを起動中...");
client.login(config.discord.token).catch((error) => {
  logger.error("ログインに失敗しました:", error);
  process.exit(1);
});
