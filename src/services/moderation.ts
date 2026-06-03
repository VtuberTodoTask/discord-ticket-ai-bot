import * as fs from "fs";
import * as path from "path";
import { config } from "../config";
import { logger } from "../utils/logger";

export interface ModerationRecord {
  timestamp: string;
  guildId: string;
  channelId: string;
  channelName: string;
  userId: string;
  userTag: string;
  messageContent: string;
  violationType: string;
  severity: "low" | "medium" | "high";
  aiSummary: string;
}

function ensureLogDir(): string {
  const logDir = config.moderation.logDir;
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

function getLogFilePath(): string {
  const logDir = ensureLogDir();
  const date = new Date().toISOString().split("T")[0];
  return path.join(logDir, `moderation_${date}.json`);
}

function readExistingLogs(filePath: string): ModerationRecord[] {
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as ModerationRecord[];
  } catch {
    logger.warn(`モデレーションログの読み込みに失敗しました: ${filePath}`);
    return [];
  }
}

export function saveModerationLog(record: ModerationRecord): void {
  try {
    const filePath = getLogFilePath();
    const logs = readExistingLogs(filePath);
    logs.push(record);
    fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), "utf-8");
    logger.info(
      `モデレーションログを保存しました: user=${record.userTag}, type=${record.violationType}, severity=${record.severity}`,
    );
  } catch (error) {
    logger.error("モデレーションログの保存に失敗しました:", error);
  }
}
