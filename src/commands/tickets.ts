import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  type APIEmbedField,
} from "discord.js";
import {
  getOpenTickets,
  getTicketsByStatus,
  type TrackedTicket,
  type TicketStatus,
} from "../services/ticketTracker";

const STATUS_LABELS: Record<TicketStatus, string> = {
  ai_handling: "🤖 AI対応中",
  staff_handling: "👤 運営対応中",
  closed: "✅ クローズ",
};

const CATEGORY_EMOJI: Record<string, string> = {
  "お気持ち": "💭",
  "提案": "💡",
  "質問": "❓",
};

export const data = new SlashCommandBuilder()
  .setName("tickets")
  .setDescription("チケット一覧を表示します")
  .addStringOption((option) =>
    option
      .setName("status")
      .setDescription("表示するチケットのステータス")
      .setRequired(false)
      .addChoices(
        { name: "すべて（オープン）", value: "all" },
        { name: "AI対応中", value: "ai_handling" },
        { name: "運営対応中", value: "staff_handling" },
        { name: "クローズ済み", value: "closed" },
      ),
  );

function formatTicketLine(ticket: TrackedTicket): string {
  const emoji = CATEGORY_EMOJI[ticket.category] ?? "📋";
  const status = STATUS_LABELS[ticket.status];
  const elapsed = getElapsed(ticket.createdAt);
  return `${emoji} <#${ticket.channelId}> — ${status}\n` +
    `  カテゴリ: **${ticket.category || "未分類"}** | 経過: ${elapsed} | メッセージ数: ${ticket.messageCount}\n` +
    `  概要: ${ticket.summary || "（なし）"}`;
}

function getElapsed(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間`;
  const days = Math.floor(hours / 24);
  return `${days}日`;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const statusFilter = interaction.options.getString("status") ?? "all";
  const guildId = interaction.guildId ?? undefined;

  let ticketList: TrackedTicket[];
  let title: string;

  if (statusFilter === "all") {
    ticketList = getOpenTickets(guildId);
    title = "📋 オープンチケット一覧";
  } else {
    ticketList = getTicketsByStatus(statusFilter as TicketStatus, guildId);
    title = `📋 チケット一覧（${STATUS_LABELS[statusFilter as TicketStatus]}）`;
  }

  if (ticketList.length === 0) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle(title)
          .setDescription("該当するチケットはありません。"),
      ],
      ephemeral: true,
    });
    return;
  }

  ticketList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const aiCount = ticketList.filter((t) => t.status === "ai_handling").length;
  const staffCount = ticketList.filter((t) => t.status === "staff_handling").length;

  const fields: APIEmbedField[] = [];

  const pageSize = 10;
  const displayList = ticketList.slice(0, pageSize);

  for (const ticket of displayList) {
    fields.push({
      name: `#${ticket.channelName}`,
      value: formatTicketLine(ticket),
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(title)
    .setDescription(
      `合計: **${ticketList.length}件** | 🤖 AI対応中: **${aiCount}件** | 👤 運営対応中: **${staffCount}件**` +
        (ticketList.length > pageSize ? `\n（最新${pageSize}件を表示）` : ""),
    )
    .addFields(fields)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
