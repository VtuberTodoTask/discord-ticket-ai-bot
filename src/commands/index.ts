import {
  REST,
  Routes,
  type ChatInputCommandInteraction,
  Collection,
  type SlashCommandBuilder,
} from "discord.js";
import { config } from "../config";
import { logger } from "../utils/logger";
import * as ticketsCommand from "./tickets";

interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands = new Collection<string, Command>();
commands.set(ticketsCommand.data.name, ticketsCommand as unknown as Command);

export async function registerCommands(clientId: string): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(config.discord.token);
  const commandData = commands.map((cmd) => cmd.data.toJSON());

  try {
    if (config.discord.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, config.discord.guildId),
        { body: commandData },
      );
      logger.info(`Slashコマンドを登録しました（ギルド: ${config.discord.guildId}）`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commandData });
      logger.info("Slashコマンドをグローバルに登録しました");
    }
  } catch (error) {
    logger.error("Slashコマンドの登録に失敗しました:", error);
  }
}

export async function handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`コマンド実行エラー (${interaction.commandName}):`, error);
    const reply = {
      content: "コマンドの実行中にエラーが発生しました。",
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}
