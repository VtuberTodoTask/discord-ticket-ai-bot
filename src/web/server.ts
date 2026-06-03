import express, { type Request, type Response, type NextFunction } from "express";
import { config } from "../config";
import { logger } from "../utils/logger";
import { getAllTickets, getOpenTickets, getTicketsByStatus, getTicket } from "../services/ticketTracker";
import { loadAllModerationLogs } from "../services/moderation";
import { renderDashboard, renderTicketDetail, renderModerationPage, renderLoginPage } from "./views";

const app = express();

app.use(express.urlencoded({ extended: true }));

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = config.web.authToken;
  if (!token) {
    next();
    return;
  }

  const cookieToken = parseCookie(req.headers.cookie ?? "")["dashboard_token"];
  const queryToken = req.query["token"] as string | undefined;

  if (cookieToken === token || queryToken === token) {
    if (queryToken === token && cookieToken !== token) {
      res.cookie("dashboard_token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    }
    next();
    return;
  }

  if (req.method === "POST" && req.body?.token === token) {
    res.cookie("dashboard_token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect(req.originalUrl);
    return;
  }

  res.status(200).send(renderLoginPage());
}

function parseCookie(cookieStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of cookieStr.split(";")) {
    const [key, val] = pair.trim().split("=");
    if (key && val) result[key] = val;
  }
  return result;
}

app.use(authMiddleware);

app.get("/", (_req: Request, res: Response) => {
  const statusFilter = (_req.query["status"] as string) ?? "open";
  const categoryFilter = (_req.query["category"] as string) ?? "all";

  let tickets;
  if (statusFilter === "all") {
    tickets = getAllTickets();
  } else if (statusFilter === "open") {
    tickets = getOpenTickets();
  } else {
    tickets = getTicketsByStatus(statusFilter as "ai_handling" | "staff_handling" | "closed");
  }

  if (categoryFilter && categoryFilter !== "all") {
    tickets = tickets.filter((t) => t.category === categoryFilter);
  }

  tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.send(renderDashboard(tickets, statusFilter, categoryFilter));
});

app.get("/ticket/:channelId", (req: Request, res: Response) => {
  const channelId = req.params["channelId"];
  const ticket = getTicket(typeof channelId === "string" ? channelId : "");
  if (!ticket) {
    res.status(404).send("<h1>チケットが見つかりません</h1>");
    return;
  }
  res.send(renderTicketDetail(ticket));
});

app.get("/moderation", (_req: Request, res: Response) => {
  const logs = loadAllModerationLogs();
  res.send(renderModerationPage(logs));
});

app.get("/api/tickets", (_req: Request, res: Response) => {
  const statusFilter = (_req.query["status"] as string) ?? "open";
  let tickets;
  if (statusFilter === "all") {
    tickets = getAllTickets();
  } else if (statusFilter === "open") {
    tickets = getOpenTickets();
  } else {
    tickets = getTicketsByStatus(statusFilter as "ai_handling" | "staff_handling" | "closed");
  }
  res.json(tickets);
});

app.get("/api/moderation", (_req: Request, res: Response) => {
  const logs = loadAllModerationLogs();
  res.json(logs);
});

export function startWebServer(): void {
  if (!config.web.enabled) {
    logger.info("Webダッシュボードは無効です");
    return;
  }

  app.listen(config.web.port, () => {
    logger.info(`Webダッシュボードを起動しました: http://localhost:${config.web.port}`);
    if (config.web.authToken) {
      logger.info("Webダッシュボードはトークン認証で保護されています");
    } else {
      logger.warn("WEB_DASHBOARD_TOKEN が未設定です。本番環境では設定を推奨します");
    }
  });
}
