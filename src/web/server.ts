import express, { type Request, type Response, type NextFunction } from "express";
import { config } from "../config";
import { logger } from "../utils/logger";
import { getAllTickets, getOpenTickets, getTicketsByStatus, getTicket, updateTicketStatus } from "../services/ticketTracker";
import { loadAllModerationLogs } from "../services/moderation";

const app = express();

app.use(express.json());

function corsMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, PATCH, POST, OPTIONS");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
}

app.use(corsMiddleware);

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = config.web.authToken;
  if (!token) {
    next();
    return;
  }

  const authHeader = req.headers["authorization"];
  if (authHeader === `Bearer ${token}`) {
    next();
    return;
  }

  const queryToken = req.query["token"] as string | undefined;
  if (queryToken === token) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}

app.post("/api/auth", express.urlencoded({ extended: true }), (req: Request, res: Response) => {
  const token = config.web.authToken;
  if (!token) {
    res.json({ success: true });
    return;
  }
  if (req.body?.token === token) {
    res.json({ success: true, token });
    return;
  }
  res.status(401).json({ error: "Invalid token" });
});

app.get("/api/auth/check", authMiddleware, (_req: Request, res: Response) => {
  res.json({ authenticated: true });
});

app.use("/api/tickets", authMiddleware);
app.use("/api/moderation", authMiddleware);

app.get("/api/tickets", (req: Request, res: Response) => {
  const statusFilter = (req.query["status"] as string) ?? "open";
  const categoryFilter = (req.query["category"] as string) ?? "all";

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
  res.json(tickets);
});

app.get("/api/tickets/:channelId", (req: Request, res: Response) => {
  const channelId = req.params["channelId"];
  const ticket = getTicket(typeof channelId === "string" ? channelId : "");
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  res.json(ticket);
});

app.patch("/api/tickets/:channelId/status", authMiddleware, (req: Request, res: Response) => {
  const channelId = req.params["channelId"];
  const { status } = req.body as { status?: string };
  const validStatuses = ["ai_handling", "staff_handling", "closed"];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status. Must be one of: ai_handling, staff_handling, closed" });
    return;
  }
  const ticket = updateTicketStatus(
    typeof channelId === "string" ? channelId : "",
    status as "ai_handling" | "staff_handling" | "closed",
  );
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  res.json(ticket);
});

app.get("/api/stats", authMiddleware, (_req: Request, res: Response) => {
  const all = getAllTickets();
  res.json({
    total: all.length,
    ai_handling: all.filter((t) => t.status === "ai_handling").length,
    staff_handling: all.filter((t) => t.status === "staff_handling").length,
    closed: all.filter((t) => t.status === "closed").length,
    by_category: {
      "お気持ち": all.filter((t) => t.category === "お気持ち").length,
      "提案": all.filter((t) => t.category === "提案").length,
      "質問": all.filter((t) => t.category === "質問").length,
    },
  });
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
    logger.info(`APIサーバーを起動しました: http://localhost:${config.web.port}`);
    if (config.web.authToken) {
      logger.info("APIはトークン認証で保護されています");
    } else {
      logger.warn("WEB_DASHBOARD_TOKEN が未設定です。本番環境では設定を推奨します");
    }
  });
}
