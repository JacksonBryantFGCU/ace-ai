import express from "express";
import type { Request, Response } from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

const EVENT_TYPES = new Set([
  "page_view",
  "signup",
  "project_created",
  "invite_sent",
  "subscription_started",
  "subscription_cancelled",
]);

type AccountRow = {
  id: number;
};

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

function nowIso() {
  return new Date().toISOString();
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

  if (typeof body.event_type !== "string" || !EVENT_TYPES.has(body.event_type)) {
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

export default app;
