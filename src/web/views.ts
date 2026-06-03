import type { TrackedTicket } from "../services/ticketTracker";
import type { ModerationRecord } from "../services/moderation";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

function getElapsed(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

const STATUS_LABELS: Record<string, string> = {
  ai_handling: "AI対応中",
  staff_handling: "運営対応中",
  closed: "クローズ",
};

const STATUS_COLORS: Record<string, string> = {
  ai_handling: "#5865f2",
  staff_handling: "#f97316",
  closed: "#57f287",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "#fee75c",
  medium: "#f97316",
  high: "#ed4245",
};

function layout(title: string, content: string, activeNav: string = ""): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Ticket Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #e0e0e0;
      min-height: 100vh;
    }
    nav {
      background: #16213e;
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
      gap: 2rem;
      border-bottom: 2px solid #0f3460;
      flex-wrap: wrap;
    }
    nav .logo {
      font-size: 1.25rem;
      font-weight: bold;
      color: #5865f2;
    }
    nav a {
      color: #a0a0b8;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      transition: all 0.2s;
    }
    nav a:hover, nav a.active {
      color: #fff;
      background: #0f3460;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1 { font-size: 1.5rem; margin-bottom: 1.5rem; color: #fff; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: #16213e;
      border-radius: 12px;
      padding: 1.25rem;
      border-left: 4px solid;
    }
    .stat-card .label { font-size: 0.85rem; color: #a0a0b8; }
    .stat-card .value { font-size: 2rem; font-weight: bold; margin-top: 0.25rem; }
    .filters {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .filters a {
      padding: 0.5rem 1rem;
      background: #16213e;
      color: #a0a0b8;
      border-radius: 20px;
      text-decoration: none;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .filters a:hover, .filters a.active {
      background: #5865f2;
      color: #fff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #16213e;
      border-radius: 12px;
      overflow: hidden;
    }
    thead { background: #0f3460; }
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #1a1a2e;
    }
    th { font-weight: 600; font-size: 0.85rem; color: #a0a0b8; text-transform: uppercase; }
    tbody tr:hover { background: #1e2a4a; }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #fff;
    }
    a.ticket-link { color: #5865f2; text-decoration: none; }
    a.ticket-link:hover { text-decoration: underline; }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .detail-card {
      background: #16213e;
      border-radius: 12px;
      padding: 1.25rem;
    }
    .detail-card .label { font-size: 0.8rem; color: #a0a0b8; margin-bottom: 0.25rem; }
    .detail-card .value { font-size: 1.1rem; }
    .empty {
      text-align: center;
      padding: 3rem;
      color: #a0a0b8;
      font-size: 1.1rem;
    }
    @media (max-width: 768px) {
      .container { padding: 1rem; }
      nav { padding: 0.75rem 1rem; gap: 0.5rem; }
      table { font-size: 0.85rem; }
      th, td { padding: 0.5rem; }
    }
  </style>
</head>
<body>
  <nav>
    <span class="logo">Ticket Dashboard</span>
    <a href="/" class="${activeNav === "tickets" ? "active" : ""}">チケット一覧</a>
    <a href="/moderation" class="${activeNav === "moderation" ? "active" : ""}">モデレーション</a>
  </nav>
  <div class="container">
    ${content}
  </div>
</body>
</html>`;
}

export function renderDashboard(
  tickets: TrackedTicket[],
  statusFilter: string,
  categoryFilter: string,
): string {
  const allTickets = tickets;
  const aiCount = allTickets.filter((t) => t.status === "ai_handling").length;
  const staffCount = allTickets.filter((t) => t.status === "staff_handling").length;
  const closedCount = allTickets.filter((t) => t.status === "closed").length;

  const statsHtml = `
    <div class="stats">
      <div class="stat-card" style="border-color: #5865f2;">
        <div class="label">AI対応中</div>
        <div class="value" style="color: #5865f2;">${aiCount}</div>
      </div>
      <div class="stat-card" style="border-color: #f97316;">
        <div class="label">運営対応中</div>
        <div class="value" style="color: #f97316;">${staffCount}</div>
      </div>
      <div class="stat-card" style="border-color: #57f287;">
        <div class="label">クローズ</div>
        <div class="value" style="color: #57f287;">${closedCount}</div>
      </div>
      <div class="stat-card" style="border-color: #a0a0b8;">
        <div class="label">合計</div>
        <div class="value">${allTickets.length}</div>
      </div>
    </div>`;

  const buildFilterUrl = (s: string, c: string) => `/?status=${s}&category=${c}`;

  const filtersHtml = `
    <div class="filters">
      <strong style="color:#a0a0b8;padding:0.5rem 0;">ステータス:</strong>
      <a href="${buildFilterUrl("open", categoryFilter)}" class="${statusFilter === "open" ? "active" : ""}">オープン</a>
      <a href="${buildFilterUrl("ai_handling", categoryFilter)}" class="${statusFilter === "ai_handling" ? "active" : ""}">AI対応中</a>
      <a href="${buildFilterUrl("staff_handling", categoryFilter)}" class="${statusFilter === "staff_handling" ? "active" : ""}">運営対応中</a>
      <a href="${buildFilterUrl("closed", categoryFilter)}" class="${statusFilter === "closed" ? "active" : ""}">クローズ</a>
      <a href="${buildFilterUrl("all", categoryFilter)}" class="${statusFilter === "all" ? "active" : ""}">すべて</a>
    </div>
    <div class="filters">
      <strong style="color:#a0a0b8;padding:0.5rem 0;">カテゴリ:</strong>
      <a href="${buildFilterUrl(statusFilter, "all")}" class="${categoryFilter === "all" ? "active" : ""}">すべて</a>
      <a href="${buildFilterUrl(statusFilter, "お気持ち")}" class="${categoryFilter === "お気持ち" ? "active" : ""}">お気持ち</a>
      <a href="${buildFilterUrl(statusFilter, "提案")}" class="${categoryFilter === "提案" ? "active" : ""}">提案</a>
      <a href="${buildFilterUrl(statusFilter, "質問")}" class="${categoryFilter === "質問" ? "active" : ""}">質問</a>
    </div>`;

  let tableHtml: string;
  if (tickets.length === 0) {
    tableHtml = `<div class="empty">該当するチケットはありません</div>`;
  } else {
    const rows = tickets.map((t) => `
      <tr>
        <td><a class="ticket-link" href="/ticket/${escapeHtml(t.channelId)}">${escapeHtml(t.channelName)}</a></td>
        <td><span class="badge" style="background:${STATUS_COLORS[t.status] ?? "#666"}">${STATUS_LABELS[t.status] ?? t.status}</span></td>
        <td>${escapeHtml(t.category || "未分類")}</td>
        <td>${escapeHtml(t.userTag)}</td>
        <td>${escapeHtml(t.summary || "（なし）")}</td>
        <td>${t.messageCount}</td>
        <td title="${formatDate(t.updatedAt)}">${getElapsed(t.updatedAt)}</td>
      </tr>`).join("");

    tableHtml = `
      <table>
        <thead>
          <tr>
            <th>チャンネル</th>
            <th>ステータス</th>
            <th>カテゴリ</th>
            <th>ユーザー</th>
            <th>概要</th>
            <th>メッセージ数</th>
            <th>最終更新</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  return layout(
    "チケット一覧",
    `<h1>チケット一覧</h1>${statsHtml}${filtersHtml}${tableHtml}`,
    "tickets",
  );
}

export function renderTicketDetail(ticket: TrackedTicket): string {
  const cards = `
    <div class="detail-grid">
      <div class="detail-card">
        <div class="label">チャンネル名</div>
        <div class="value">${escapeHtml(ticket.channelName)}</div>
      </div>
      <div class="detail-card">
        <div class="label">ステータス</div>
        <div class="value"><span class="badge" style="background:${STATUS_COLORS[ticket.status] ?? "#666"}">${STATUS_LABELS[ticket.status] ?? ticket.status}</span></div>
      </div>
      <div class="detail-card">
        <div class="label">カテゴリ</div>
        <div class="value">${escapeHtml(ticket.category || "未分類")}</div>
      </div>
      <div class="detail-card">
        <div class="label">ユーザー</div>
        <div class="value">${escapeHtml(ticket.userTag)} <span style="color:#a0a0b8;font-size:0.85rem">(${escapeHtml(ticket.userId)})</span></div>
      </div>
      <div class="detail-card">
        <div class="label">作成日時</div>
        <div class="value">${formatDate(ticket.createdAt)}</div>
      </div>
      <div class="detail-card">
        <div class="label">最終更新</div>
        <div class="value">${formatDate(ticket.updatedAt)} (${getElapsed(ticket.updatedAt)})</div>
      </div>
      <div class="detail-card">
        <div class="label">エスカレーション日時</div>
        <div class="value">${ticket.escalatedAt ? formatDate(ticket.escalatedAt) : "—"}</div>
      </div>
      <div class="detail-card">
        <div class="label">メッセージ数</div>
        <div class="value">${ticket.messageCount}</div>
      </div>
    </div>
    <div class="detail-card" style="margin-bottom:1rem;">
      <div class="label">概要</div>
      <div class="value">${escapeHtml(ticket.summary || "（なし）")}</div>
    </div>
    <div class="detail-card">
      <div class="label">チャンネルID</div>
      <div class="value" style="font-family:monospace;font-size:0.9rem;">${escapeHtml(ticket.channelId)}</div>
    </div>`;

  return layout(
    `#${ticket.channelName}`,
    `<h1><a href="/" style="color:#5865f2;text-decoration:none;">&larr;</a> #${escapeHtml(ticket.channelName)}</h1>${cards}`,
    "tickets",
  );
}

export function renderModerationPage(logs: ModerationRecord[]): string {
  let tableHtml: string;
  if (logs.length === 0) {
    tableHtml = `<div class="empty">モデレーションログはありません</div>`;
  } else {
    const rows = logs.map((l) => `
      <tr>
        <td title="${escapeHtml(l.timestamp)}">${formatDate(l.timestamp)}</td>
        <td>${escapeHtml(l.userTag)}</td>
        <td>${escapeHtml(l.channelName)}</td>
        <td>${escapeHtml(l.violationType)}</td>
        <td><span class="badge" style="background:${SEVERITY_COLORS[l.severity] ?? "#666"};${l.severity === "low" ? "color:#000;" : ""}">${escapeHtml(l.severity)}</span></td>
        <td>${escapeHtml(l.aiSummary)}</td>
        <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(l.messageContent)}">${escapeHtml(l.messageContent)}</td>
      </tr>`).join("");

    tableHtml = `
      <table>
        <thead>
          <tr>
            <th>日時</th>
            <th>ユーザー</th>
            <th>チャンネル</th>
            <th>違反種別</th>
            <th>重大度</th>
            <th>AI概要</th>
            <th>発言内容</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  return layout(
    "モデレーションログ",
    `<h1>モデレーションログ</h1>${tableHtml}`,
    "moderation",
  );
}

export function renderLoginPage(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ログイン - Ticket Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-card {
      background: #16213e;
      border-radius: 12px;
      padding: 2rem;
      max-width: 400px;
      width: 100%;
    }
    h1 { font-size: 1.25rem; margin-bottom: 1rem; color: #5865f2; text-align: center; }
    input {
      width: 100%;
      padding: 0.75rem;
      background: #1a1a2e;
      border: 1px solid #0f3460;
      border-radius: 8px;
      color: #e0e0e0;
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    button {
      width: 100%;
      padding: 0.75rem;
      background: #5865f2;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
    }
    button:hover { background: #4752c4; }
  </style>
</head>
<body>
  <div class="login-card">
    <h1>Ticket Dashboard</h1>
    <form method="POST">
      <input type="password" name="token" placeholder="アクセストークンを入力" required />
      <button type="submit">ログイン</button>
    </form>
  </div>
</body>
</html>`;
}
