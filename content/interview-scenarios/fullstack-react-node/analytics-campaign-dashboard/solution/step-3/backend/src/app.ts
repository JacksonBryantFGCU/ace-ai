import express from "express";
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_TRANSITIONS,
  getCampaignDetail,
  getCampaignRowById,
  getChannelById,
  getSummaryMetrics,
  listCampaignAnalytics,
  listChannels,
  resetDatabase,
  updateCampaign,
  type CampaignStatus,
} from "./db";

const VALID_STATUSES = new Set<CampaignStatus>(CAMPAIGN_STATUSES);
const ALLOWED_UPDATE_FIELDS = new Set(["budget_cents", "status"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseStatus(value: unknown): CampaignStatus | null {
  return typeof value === "string" && VALID_STATUSES.has(value as CampaignStatus) ? (value as CampaignStatus) : null;
}

function isValidDate(value: string): boolean {
  return DATE_PATTERN.test(value) && !Number.isNaN(new Date(value).getTime());
}

interface ResolvedFilters {
  status?: CampaignStatus;
  channelId?: number;
  startDate?: string;
  endDate?: string;
}

async function resolveCampaignFilters(
  query: Record<string, unknown>,
): Promise<{ ok: true; filters: ResolvedFilters } | { ok: false; status: number; error: string }> {
  const filters: ResolvedFilters = {};

  if (query.status !== undefined) {
    if (Array.isArray(query.status)) return { ok: false, status: 400, error: "Invalid campaign status" };
    const parsed = parseStatus(query.status);
    if (!parsed) return { ok: false, status: 400, error: "Invalid campaign status" };
    filters.status = parsed;
  }

  if (query.channel_id !== undefined) {
    if (Array.isArray(query.channel_id)) return { ok: false, status: 400, error: "Invalid channel id" };
    const id = parseId(query.channel_id);
    if (!id) return { ok: false, status: 400, error: "Invalid channel id" };
    const channel = await getChannelById(id);
    if (!channel) return { ok: false, status: 404, error: "Channel not found" };
    filters.channelId = id;
  }

  if (query.start_date !== undefined) {
    if (typeof query.start_date !== "string" || !isValidDate(query.start_date)) {
      return { ok: false, status: 400, error: "Invalid start date" };
    }
    filters.startDate = query.start_date;
  }

  if (query.end_date !== undefined) {
    if (typeof query.end_date !== "string" || !isValidDate(query.end_date)) {
      return { ok: false, status: 400, error: "Invalid end date" };
    }
    filters.endDate = query.end_date;
  }

  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    return { ok: false, status: 400, error: "Invalid date range" };
  }

  return { ok: true, filters };
}

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,PATCH,OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/__test/reset", async (_req, res) => {
  if (process.env.NODE_ENV !== "test") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await resetDatabase();
  res.json({ ok: true });
});

app.get("/campaigns", async (req, res) => {
  const resolved = await resolveCampaignFilters(req.query as Record<string, unknown>);
  if (!resolved.ok) {
    res.status(resolved.status).json({ error: resolved.error });
    return;
  }

  const campaigns = await listCampaignAnalytics(resolved.filters);
  res.json({ campaigns });
});

app.get("/campaigns/summary", async (req, res) => {
  const resolved = await resolveCampaignFilters(req.query as Record<string, unknown>);
  if (!resolved.ok) {
    res.status(resolved.status).json({ error: resolved.error });
    return;
  }

  const summary = await getSummaryMetrics(resolved.filters);
  res.json({ summary });
});

app.get("/campaign-options", async (_req, res) => {
  const channels = await listChannels();
  res.json({ channels });
});

app.get("/campaigns/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid campaign id" });
    return;
  }

  const resolved = await resolveCampaignFilters(req.query as Record<string, unknown>);
  if (!resolved.ok) {
    res.status(resolved.status).json({ error: resolved.error });
    return;
  }

  const detail = await getCampaignDetail(id, resolved.filters);
  if (!detail) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(detail);
});

app.patch("/campaigns/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid campaign id" });
    return;
  }

  const existing = await getCampaignRowById(id);
  if (!existing) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const keys = Object.keys(body);

  if (keys.length === 0) {
    res.status(400).json({ error: "No update fields provided" });
    return;
  }

  if (keys.some((key) => !ALLOWED_UPDATE_FIELDS.has(key))) {
    res.status(400).json({ error: "Unknown update field" });
    return;
  }

  let budgetCents: number | undefined;
  if (body.budget_cents !== undefined) {
    const value = Number(body.budget_cents);
    if (!Number.isInteger(value) || value < 0) {
      res.status(400).json({ error: "Invalid budget" });
      return;
    }
    budgetCents = value;
  }

  let status: CampaignStatus | undefined;
  if (body.status !== undefined) {
    const parsed = parseStatus(body.status);
    if (!parsed) {
      res.status(400).json({ error: "Invalid campaign status" });
      return;
    }
    if (!CAMPAIGN_STATUS_TRANSITIONS[existing.status].includes(parsed)) {
      res.status(400).json({ error: "Invalid status transition" });
      return;
    }
    status = parsed;
  }

  if (existing.status === "completed") {
    res.status(400).json({ error: "Campaign is completed" });
    return;
  }

  const detail = await updateCampaign({ id, budget_cents: budgetCents, status, updated_at: new Date().toISOString() });
  res.json({ campaign: detail!.campaign });
});

export default app;
