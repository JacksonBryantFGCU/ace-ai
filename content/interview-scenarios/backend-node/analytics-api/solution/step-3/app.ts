import express from "express";
import type { Request, Response } from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

const EVENT_TYPES = [
  "page_view",
  "signup",
  "project_created",
  "invite_sent",
  "subscription_started",
  "subscription_cancelled",
];
const FUNNEL_STAGES = ["signup", "project_created", "subscription_started"];
const EVENT_TYPE_SET = new Set(EVENT_TYPES);

type AccountRow = { id: number };
type EventRow = {
  id: number;
  external_id: string;
  account_id: number;
  user_id: string;
  event_type: string;
  occurred_at: string;
  properties_json: string;
  created_at: string;
};
type ReportParams = {
  accountId: number;
  start: string;
  end: string;
};

function nowIso() {
  return new Date().toISOString();
}

function queryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isIsoDate(value: string) {
  return !Number.isNaN(Date.parse(value));
}

function findAccount(accountId: number) {
  return db.get<AccountRow>("SELECT id FROM accounts WHERE id = ?", [accountId]);
}

function findEventByExternalId(externalId: string) {
  return db.get<EventRow>(
    "SELECT id, external_id, account_id, user_id, event_type, occurred_at, properties_json, created_at FROM events WHERE external_id = ?",
    [externalId],
  );
}

function eventResponse(row: EventRow) {
  return {
    id: row.id,
    external_id: row.external_id,
    account_id: row.account_id,
    user_id: row.user_id,
    event_type: row.event_type,
    occurred_at: row.occurred_at,
    properties: JSON.parse(row.properties_json) as Record<string, unknown>,
    created_at: row.created_at,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readReportParams(req: Request, res: Response): ReportParams | null {
  const accountId = parsePositiveId(queryValue(req.query.account_id));
  if (!accountId) {
    res.status(400).json({ error: "Invalid account id" });
    return null;
  }
  if (!findAccount(accountId)) {
    res.status(404).json({ error: "Account not found" });
    return null;
  }

  const start = queryValue(req.query.start);
  if (typeof start !== "string" || !isIsoDate(start)) {
    res.status(400).json({ error: "Invalid start" });
    return null;
  }

  const end = queryValue(req.query.end);
  if (typeof end !== "string" || !isIsoDate(end)) {
    res.status(400).json({ error: "Invalid end" });
    return null;
  }

  if (Date.parse(start) > Date.parse(end)) {
    res.status(400).json({ error: "Invalid time range" });
    return null;
  }

  return { accountId, start, end };
}

function datesBetween(start: string, end: string) {
  const dates: string[] = [];
  const current = new Date(`${start.slice(0, 10)}T00:00:00.000Z`);
  const last = new Date(`${end.slice(0, 10)}T00:00:00.000Z`);

  while (current.getTime() <= last.getTime()) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function rate(users: number, signupUsers: number) {
  if (signupUsers === 0) return 0;
  return Math.round((users / signupUsers) * 100) / 100;
}

app.post("/events", (req: Request, res: Response) => {
  const body = req.body as {
    external_id?: unknown;
    account_id?: unknown;
    user_id?: unknown;
    event_type?: unknown;
    occurred_at?: unknown;
    properties?: unknown;
  };
  const externalId = typeof body.external_id === "string" ? body.external_id.trim() : "";
  if (!externalId) {
    res.status(400).json({ error: "External id is required" });
    return;
  }

  const existing = findEventByExternalId(externalId);
  if (existing) {
    res.status(200).json({ event: eventResponse(existing), duplicate: true });
    return;
  }

  if (body.account_id === undefined) {
    res.status(400).json({ error: "Account id is required" });
    return;
  }
  const accountId = parsePositiveId(body.account_id);
  if (!accountId) {
    res.status(400).json({ error: "Invalid account id" });
    return;
  }
  if (!findAccount(accountId)) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  if (!userId) {
    res.status(400).json({ error: "User id is required" });
    return;
  }
  if (typeof body.event_type !== "string" || !EVENT_TYPE_SET.has(body.event_type)) {
    res.status(400).json({ error: "Invalid event type" });
    return;
  }

  const occurredAt = typeof body.occurred_at === "string" ? body.occurred_at.trim() : "";
  if (!occurredAt) {
    res.status(400).json({ error: "Occurred at is required" });
    return;
  }
  if (!isIsoDate(occurredAt)) {
    res.status(400).json({ error: "Invalid occurred at" });
    return;
  }

  const properties = body.properties === undefined ? {} : body.properties;
  if (!isPlainObject(properties)) {
    res.status(400).json({ error: "Invalid properties" });
    return;
  }

  const result = db.run(
    "INSERT INTO events (external_id, account_id, user_id, event_type, occurred_at, properties_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [externalId, accountId, userId, body.event_type, occurredAt, JSON.stringify(properties), nowIso()],
  );
  const event = db.get<EventRow>(
    "SELECT id, external_id, account_id, user_id, event_type, occurred_at, properties_json, created_at FROM events WHERE id = ?",
    [result.lastInsertRowid],
  )!;

  res.status(201).json({ event: eventResponse(event) });
});

app.get("/analytics/events", (req: Request, res: Response) => {
  const params = readReportParams(req, res);
  if (!params) return;

  const eventType = queryValue(req.query.event_type);
  if (eventType !== undefined && (typeof eventType !== "string" || !EVENT_TYPE_SET.has(eventType))) {
    res.status(400).json({ error: "Invalid event type" });
    return;
  }

  const rows = db.all<{ event_type: string; count: number }>(
    `SELECT event_type, COUNT(*) AS count
     FROM events
     WHERE account_id = ? AND occurred_at >= ? AND occurred_at <= ?
       AND (? IS NULL OR event_type = ?)
     GROUP BY event_type`,
    [params.accountId, params.start, params.end, eventType ?? null, eventType ?? null],
  );
  const keys = typeof eventType === "string" ? [eventType] : EVENT_TYPES;
  const byType = Object.fromEntries(keys.map((type) => [type, 0])) as Record<string, number>;
  for (const row of rows) byType[row.event_type] = row.count;

  res.status(200).json({
    total_events: Object.values(byType).reduce((sum, count) => sum + count, 0),
    by_type: byType,
  });
});

app.get("/analytics/daily-active-users", (req: Request, res: Response) => {
  const params = readReportParams(req, res);
  if (!params) return;

  const rows = db.all<{ day: string; active_users: number }>(
    `SELECT substr(occurred_at, 1, 10) AS day, COUNT(DISTINCT user_id) AS active_users
     FROM events
     WHERE account_id = ? AND occurred_at >= ? AND occurred_at <= ?
     GROUP BY day`,
    [params.accountId, params.start, params.end],
  );
  const counts = new Map(rows.map((row) => [row.day, row.active_users]));

  res.status(200).json({
    days: datesBetween(params.start, params.end).map((date) => ({
      date,
      active_users: counts.get(date) ?? 0,
    })),
  });
});

app.get("/analytics/funnel", (req: Request, res: Response) => {
  const params = readReportParams(req, res);
  if (!params) return;

  const rows = db.all<{ event_type: string; users: number }>(
    `SELECT event_type, COUNT(DISTINCT user_id) AS users
     FROM events
     WHERE account_id = ? AND occurred_at >= ? AND occurred_at <= ?
       AND event_type IN ('signup', 'project_created', 'subscription_started')
     GROUP BY event_type`,
    [params.accountId, params.start, params.end],
  );
  const counts = new Map(rows.map((row) => [row.event_type, row.users]));
  const signupUsers = counts.get("signup") ?? 0;

  res.status(200).json({
    funnel: FUNNEL_STAGES.map((stage) => {
      const users = counts.get(stage) ?? 0;
      return {
        stage,
        users,
        conversion_rate: stage === "signup" && users > 0 ? 1 : rate(users, signupUsers),
      };
    }),
  });
});

export default app;
