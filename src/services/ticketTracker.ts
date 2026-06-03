import * as fs from "fs";
import * as path from "path";
import { config } from "../config";
import { logger } from "../utils/logger";

export type TicketStatus = "ai_handling" | "staff_handling" | "closed";
export type TicketCategory = "お気持ち" | "提案" | "質問" | "";

export interface TrackedTicket {
  channelId: string;
  channelName: string;
  guildId: string;
  userId: string;
  userTag: string;
  category: TicketCategory;
  status: TicketStatus;
  summary: string;
  createdAt: string;
  updatedAt: string;
  escalatedAt: string | null;
  messageCount: number;
}

function getDataFilePath(): string {
  const dir = config.ticketTracker.dataDir;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "tickets.json");
}

function loadTickets(): Map<string, TrackedTicket> {
  const filePath = getDataFilePath();
  if (!fs.existsSync(filePath)) return new Map();
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const arr: TrackedTicket[] = JSON.parse(content);
    return new Map(arr.map((t) => [t.channelId, t]));
  } catch {
    logger.warn("チケットデータの読み込みに失敗しました");
    return new Map();
  }
}

function saveTickets(tickets: Map<string, TrackedTicket>): void {
  const filePath = getDataFilePath();
  const arr = Array.from(tickets.values());
  fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), "utf-8");
}

const tickets = loadTickets();

export function upsertTicket(
  channelId: string,
  update: Partial<TrackedTicket> & Pick<TrackedTicket, "channelName" | "guildId" | "userId" | "userTag">,
): TrackedTicket {
  const now = new Date().toISOString();
  const existing = tickets.get(channelId);

  if (existing) {
    const updated: TrackedTicket = {
      ...existing,
      ...update,
      channelId,
      updatedAt: now,
      messageCount: (existing.messageCount ?? 0) + 1,
    };
    tickets.set(channelId, updated);
    saveTickets(tickets);
    return updated;
  }

  const newTicket: TrackedTicket = {
    channelId,
    channelName: update.channelName,
    guildId: update.guildId,
    userId: update.userId,
    userTag: update.userTag,
    category: update.category ?? "",
    status: update.status ?? "ai_handling",
    summary: update.summary ?? "",
    createdAt: now,
    updatedAt: now,
    escalatedAt: null,
    messageCount: 1,
  };
  tickets.set(channelId, newTicket);
  saveTickets(tickets);
  logger.info(`チケットを登録しました: ${channelId} (${update.channelName})`);
  return newTicket;
}

export function markEscalated(channelId: string): void {
  const ticket = tickets.get(channelId);
  if (!ticket) return;
  ticket.status = "staff_handling";
  ticket.escalatedAt = new Date().toISOString();
  ticket.updatedAt = new Date().toISOString();
  tickets.set(channelId, ticket);
  saveTickets(tickets);
  logger.info(`チケットをエスカレーション状態に変更: ${channelId}`);
}

export function markClosed(channelId: string): void {
  const ticket = tickets.get(channelId);
  if (!ticket) return;
  ticket.status = "closed";
  ticket.updatedAt = new Date().toISOString();
  tickets.set(channelId, ticket);
  saveTickets(tickets);
  logger.info(`チケットをクローズ: ${channelId}`);
}

export function updateTicketStatus(channelId: string, status: TicketStatus): TrackedTicket | null {
  const ticket = tickets.get(channelId);
  if (!ticket) return null;
  const now = new Date().toISOString();
  ticket.status = status;
  ticket.updatedAt = now;
  if (status === "staff_handling" && !ticket.escalatedAt) {
    ticket.escalatedAt = now;
  }
  tickets.set(channelId, ticket);
  saveTickets(tickets);
  logger.info(`チケットステータスを変更: ${channelId} → ${status}`);
  return ticket;
}

export function removeTicket(channelId: string): void {
  tickets.delete(channelId);
  saveTickets(tickets);
}

export function getOpenTickets(guildId?: string): TrackedTicket[] {
  return Array.from(tickets.values()).filter((t) => {
    if (t.status === "closed") return false;
    if (guildId && t.guildId !== guildId) return false;
    return true;
  });
}

export function getTicketsByStatus(status: TicketStatus, guildId?: string): TrackedTicket[] {
  return Array.from(tickets.values()).filter((t) => {
    if (t.status !== status) return false;
    if (guildId && t.guildId !== guildId) return false;
    return true;
  });
}

export function getTicket(channelId: string): TrackedTicket | undefined {
  return tickets.get(channelId);
}

export function getAllTickets(): TrackedTicket[] {
  return Array.from(tickets.values());
}
