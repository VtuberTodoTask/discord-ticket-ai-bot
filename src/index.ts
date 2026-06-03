import { Client, GatewayIntentBits, Partials, type ChatInputCommandInteraction } from "discord.js";
import { config } from "./config";
import { logger } from "./utils/logger";
import { handleReady } from "./events/ready";
import { handleMessageCreate } from "./events/messageCreate";
import { handleChannelCreate } from "./events/channelCreate";
import { handleChannelDelete } from "./events/channelDelete";
import { registerCommands, handleInteraction } from "./commands";
import { startWebServer } from "./web/server";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once("ready", (c) => {
  handleReady(c);
  void registerCommands(c.user.id);
});
client.on("messageCreate", (message) => void handleMessageCreate(message));
client.on("channelCreate", (channel) => handleChannelCreate(channel));
client.on("channelDelete", (channel) => handleChannelDelete(channel));
client.on("interactionCreate", (interaction) => {
  if (interaction.isChatInputCommand()) {
    void handleInteraction(interaction as ChatInputCommandInteraction);
  }
});

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

startWebServer(client);

logger.info("Botを起動中...");
client.login(config.discord.token).catch((error) => {
  logger.error("ログインに失敗しました:", error);
  process.exit(1);
});
